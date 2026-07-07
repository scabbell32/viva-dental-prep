import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import type { Track, SafeQuestion, CaseSetWithImages, CaseImage } from '@/types/database'

const QUESTION_COLUMNS = 'id, track, week_number, chapter_tag, question_text, option_a, option_b, option_c, option_d, option_e, difficulty, question_text_es, option_a_es, option_b_es, option_c_es, option_d_es, option_e_es, image_url, image_urls, case_set_id, question_type, sequence_order, lock_option_order'

// Admin builder also needs correct answers
const ADMIN_COLUMNS = QUESTION_COLUMNS + ', correct_option, explanation, explanation_es'

const DEFAULT_TARGET = 10
const MAX_CASE_SETS = 2

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function caseQuestionBudget(total: number, target: number): number {
  if (total <= 3) return total
  if (total <= 5) return Math.min(total, Math.ceil(target * 0.5))
  return Math.min(total, 3 + Math.floor(Math.random() * 3))
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()
  const { searchParams } = new URL(request.url)

  const track       = (searchParams.get('track') ?? 'nbdhe') as Track
  const week        = parseInt(searchParams.get('week') ?? '1')
  const chapterTag  = searchParams.get('chapter_tag') ?? null
  const count       = Math.min(parseInt(searchParams.get('count') ?? String(DEFAULT_TARGET)), 50)
  const difficulty  = searchParams.get('difficulty') ?? 'mixed'   // easy | medium | hard | mixed
  const typeFilter  = searchParams.get('type') ?? 'both'          // standalone | case | both
  const isAdmin     = user.user_metadata?.role === 'admin'
  const cols        = isAdmin ? ADMIN_COLUMNS : QUESTION_COLUMNS

  if (!['nbdhe', 'jurisprudence'].includes(track)) {
    return NextResponse.json({ error: 'Invalid track' }, { status: 400 })
  }

  const caseQuestions: SafeQuestion[] = []

  // ── 1. Case questions ──────────────────────────────────────────────────────
  if (typeFilter === 'case' || typeFilter === 'both') {
    let csQuery = adminClient
      .from('case_sets')
      .select('*, images:case_images(id, image_url, storage_path, caption, display_order)')
      .eq('track', track)
      .eq('is_active', true)

    if (chapterTag) {
      csQuery = csQuery.eq('chapter_tag', chapterTag)
    } else {
      const { data: weekData } = await adminClient
        .from('program_weeks').select('chapter_tags').eq('week_number', week).single()
      const tags = weekData?.chapter_tags ?? []
      if (tags.length > 0) csQuery = csQuery.in('chapter_tag', tags)
    }

    const { data: rawCaseSets } = await csQuery
    const caseSets = (rawCaseSets ?? []).map(cs => ({
      ...cs,
      images: ((cs.images ?? []) as CaseImage[]).sort((a, b) => a.display_order - b.display_order),
    })) as CaseSetWithImages[]

    const maxCaseSets = typeFilter === 'case' ? Math.ceil(count / 3) : MAX_CASE_SETS
    const selectedCaseSets = shuffle(caseSets).slice(0, maxCaseSets)

    for (const caseSet of selectedCaseSets) {
      let qQuery = adminClient
        .from('questions')
        .select(cols)
        .eq('case_set_id', caseSet.id)
        .eq('is_active', true)
        .order('sequence_order', { ascending: true })

      if (difficulty !== 'mixed') qQuery = qQuery.eq('difficulty', difficulty)

      const { data: allInSet } = await qQuery
      if (!allInSet || allInSet.length === 0) continue

      const budget = caseQuestionBudget(allInSet.length, count)
      const maxStart = Math.max(0, allInSet.length - budget)
      const start = Math.floor(Math.random() * (maxStart + 1))
      const subset = allInSet.slice(start, start + budget)

      for (const q of subset) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        caseQuestions.push({ ...(q as any), case_set: caseSet } as SafeQuestion)
      }
    }
  }

  // ── 2. Standalone questions ────────────────────────────────────────────────
  const standalones: SafeQuestion[] = []

  if (typeFilter === 'standalone' || typeFilter === 'both') {
    const remainingBudget = Math.max(0, count - caseQuestions.length)

    let sqQuery = adminClient
      .from('questions')
      .select(cols)
      .eq('track', track)
      .eq('is_active', true)
      .eq('question_type', 'standalone')

    if (chapterTag) sqQuery = sqQuery.eq('chapter_tag', chapterTag)
    if (difficulty !== 'mixed') sqQuery = sqQuery.eq('difficulty', difficulty)
    if (!chapterTag) sqQuery = sqQuery.lte('week_number', week)

    const { data: pool } = await sqQuery.limit(200)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    standalones.push(...(shuffle(pool ?? []).slice(0, remainingBudget) as any[]))
  }

  return NextResponse.json([...caseQuestions, ...standalones])
}
