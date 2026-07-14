import { createAdminClient } from '@/lib/supabase/admin'
import { shuffle } from '@/lib/utils'
import type { SafeQuestion, Track } from '@/types/database'

const SAFE_COLUMNS = 'id, track, week_number, chapter_tag, question_text, option_a, option_b, option_c, option_d, option_e, option_f, difficulty, question_text_es, option_a_es, option_b_es, option_c_es, option_d_es, option_e_es, option_f_es, image_url, image_urls, context_text, case_set_id, question_type, sequence_order, lock_option_order, is_legacy, case_set:case_sets(*, images:case_images(*))'

interface AnswerRecord {
  question_id: string
  is_correct: boolean
  used_translation?: boolean
}

interface AttemptRow {
  completed_at: string
  answers: AnswerRecord[]
}

interface QuestionStats {
  question_id: string
  missCount: number
  lastResult: boolean
  lastSeen: Date
  correctAfterMiss: boolean
  usedTranslationRecently: boolean
}

function daysSince(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
}

export interface ReviewDeck {
  questions: SafeQuestion[]
  eligibleCount: number
  isMixed: boolean
}

export async function buildReviewDeck(candidateId: string, track: Track): Promise<ReviewDeck> {
  const adminDb = createAdminClient()

  const { data: attempts } = await adminDb
    .from('quiz_attempts')
    .select('completed_at, answers')
    .eq('candidate_id', candidateId)
    .eq('track', track)
    .order('completed_at', { ascending: false })
    .limit(10)

  if (!attempts || attempts.length === 0) {
    return { questions: [], eligibleCount: 0, isMixed: false }
  }

  // Expand JSONB answers in TypeScript — track per-question history
  const statMap = new Map<string, QuestionStats>()

  for (const attempt of attempts as AttemptRow[]) {
    const attemptDate = new Date(attempt.completed_at)
    const answers: AnswerRecord[] = Array.isArray(attempt.answers) ? attempt.answers : []

    for (const ans of answers) {
      const existing = statMap.get(ans.question_id)

      if (!existing) {
        statMap.set(ans.question_id, {
          question_id: ans.question_id,
          missCount: ans.is_correct ? 0 : 1,
          lastResult: ans.is_correct,
          lastSeen: attemptDate,
          correctAfterMiss: false,
          usedTranslationRecently: ans.used_translation ?? false,
        })
      } else {
        // We iterate newest-first so older answers refine context
        if (!ans.is_correct) existing.missCount++
        // If this older attempt was a miss, and lastResult (newest) was correct: single-success after miss
        if (!ans.is_correct && existing.lastResult) existing.correctAfterMiss = true
        // Track translation use in 2 most-recent occurrences (we only set from newest, flag if seen)
        if (ans.used_translation) existing.usedTranslationRecently = true
      }
    }
  }

  const allStats = Array.from(statMap.values())

  // Eligible = last answer was wrong, OR correct only once after ≥1 miss (not yet "learned")
  const eligible = allStats.filter(s => !s.lastResult || (s.correctAfterMiss && s.missCount >= 1))

  // Priority score
  const scored = eligible.map(s => ({
    ...s,
    priority: s.missCount * 2 + (s.usedTranslationRecently ? 1 : 0) + daysSince(s.lastSeen) / 7,
  }))

  scored.sort((a, b) => b.priority - a.priority)
  const top = scored.slice(0, 10)
  const eligibleCount = eligible.length

  let isMixed = false
  let questionIds = top.map(s => s.question_id)

  // Backfill if fewer than 4 eligible
  if (questionIds.length < 4) {
    isMixed = true
    const exclude = new Set(questionIds)
    const { data: filler } = await adminDb
      .from('questions')
      .select(SAFE_COLUMNS)
      .eq('track', track)
      .eq('is_active', true)
      .eq('is_legacy', false) // only new + reviewed-and-cleared questions reach candidates
      .limit(30)
    const shuffled = shuffle((filler ?? []).filter(q => !exclude.has(q.id)))
      .slice(0, 10 - questionIds.length)
    questionIds = [...questionIds, ...shuffled.map(q => q.id)]
  }

  if (questionIds.length === 0) return { questions: [], eligibleCount: 0, isMixed: false }

  const { data: rows } = await adminDb
    .from('questions')
    .select(SAFE_COLUMNS)
    .in('id', questionIds)
    .eq('is_active', true)
    .eq('is_legacy', false) // don't resurface unreviewed legacy questions in repaso

  const parsed = (rows ?? []).map(q => {
    const rawCaseSet = (q as any).case_set
    const caseSet = Array.isArray(rawCaseSet) ? rawCaseSet[0] : rawCaseSet
    if (caseSet && Array.isArray(caseSet.images)) {
      caseSet.images = [...caseSet.images].sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
    }
    return {
      ...q,
      case_set: caseSet || null
    }
  })

  const questions = shuffle(parsed) as unknown as SafeQuestion[]

  return { questions, eligibleCount, isMixed }
}
