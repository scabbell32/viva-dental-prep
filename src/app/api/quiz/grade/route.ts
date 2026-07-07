import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import type { Track, Option, SubmitResponse, VocabHint } from '@/types/database'

const VALID_OPTIONS = new Set<Option>(['a', 'b', 'c', 'd'])

// Grades answers server-side without persisting a quiz_attempt.
// Used for the English phase of the bilingual quiz flow.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { track, week_number: _week, answers }: {
    track: Track
    week_number: number
    answers: { question_id: string; selected_option: Option; used_translation?: boolean }[]
  } = body

  if (!answers?.length) return NextResponse.json({ error: 'answers required' }, { status: 400 })
  if (answers.some(a => !VALID_OPTIONS.has(a.selected_option))) {
    return NextResponse.json({ error: 'invalid selected_option' }, { status: 400 })
  }

  const adminDb = createAdminClient()
  const ids = answers.map(a => a.question_id)

  const { data: questions } = await adminDb
    .from('questions')
    .select('id, track, chapter_tag, correct_option, explanation, explanation_es')
    .in('id', ids)

  if (!questions || questions.length !== ids.length) {
    return NextResponse.json({ error: 'one or more question_ids not found' }, { status: 400 })
  }
  if (questions.find(q => q.track !== track)) {
    return NextResponse.json({ error: 'question track mismatch' }, { status: 400 })
  }

  const questionMap = Object.fromEntries(questions.map(q => [q.id, q]))

  const graded = answers.map(a => {
    const q = questionMap[a.question_id]
    return {
      question_id: a.question_id,
      selected_option: a.selected_option,
      correct_option: q.correct_option as Option,
      is_correct: a.selected_option === q.correct_option,
      explanation: q.explanation as string | null,
      explanation_es: q.explanation_es as string | null,
      used_translation: a.used_translation ?? false,
      chapter_tag: q.chapter_tag as string | null,
    }
  })

  const translation_reveals = graded.filter(a => a.used_translation).length

  const wrongTranslatedTags = [...new Set(
    graded
      .filter(a => !a.is_correct && a.used_translation && a.chapter_tag)
      .map(a => a.chapter_tag as string)
  )]

  const vocabByTag: Record<string, VocabHint[]> = {}
  if (wrongTranslatedTags.length > 0) {
    const { data: vocab } = await adminDb
      .from('vocab_sets')
      .select('chapter_tag, spanish_term, english_term')
      .in('chapter_tag', wrongTranslatedTags)
    for (const v of vocab ?? []) {
      if (!v.chapter_tag) continue
      if (!vocabByTag[v.chapter_tag]) vocabByTag[v.chapter_tag] = []
      if (vocabByTag[v.chapter_tag].length < 5) {
        vocabByTag[v.chapter_tag].push({ spanish_term: v.spanish_term, english_term: v.english_term })
      }
    }
  }

  const response: SubmitResponse = {
    attempt_id: '',
    score: graded.filter(a => a.is_correct).length,
    total: answers.length,
    translation_reveals,
    review: graded.map(a => ({
      question_id: a.question_id,
      selected_option: a.selected_option,
      correct_option: a.correct_option,
      is_correct: a.is_correct,
      explanation: a.explanation,
      explanation_es: a.explanation_es,
      used_translation: a.used_translation,
      related_vocab: vocabByTag[a.chapter_tag ?? ''] ?? [],
    })),
  }

  return NextResponse.json(response)
}
