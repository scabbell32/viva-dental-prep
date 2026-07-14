import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import type { Track, SafeQuestion, CaseSetWithImages, CaseImage } from '@/types/database'

const QUESTION_COLUMNS = 'id, track, week_number, chapter_tag, question_text, option_a, option_b, option_c, option_d, option_e, difficulty, question_text_es, option_a_es, option_b_es, option_c_es, option_d_es, option_e_es, image_url, image_urls, context_text, case_set_id, question_type, sequence_order, lock_option_order'

// Admin builder also needs correct answers
const ADMIN_COLUMNS = QUESTION_COLUMNS + ', correct_option, explanation, explanation_es'

const DEFAULT_MIN = 10
const DEFAULT_MAX = 15

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

// A random contiguous window of 2–3 questions from a group (or the whole group if smaller),
// so a shared image is reused by a few questions and never orphaned.
function groupWindow<T>(sorted: T[]): T[] {
  const size = Math.min(sorted.length, 2 + Math.floor(Math.random() * 2)) // 2 or 3, capped by group size
  const start = Math.floor(Math.random() * (sorted.length - size + 1))
  return sorted.slice(start, start + size)
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
  const difficulty  = searchParams.get('difficulty') ?? 'mixed'   // easy | medium | hard | mixed
  const typeFilter  = searchParams.get('type') ?? 'both'          // standalone | case | both
  const isAdmin     = user.user_metadata?.role === 'admin'
  const cols        = isAdmin ? ADMIN_COLUMNS : QUESTION_COLUMNS

  // Range of how many questions to build. The exact count is decided below based
  // on what makes a clean quiz given the case groups available. `count` is still
  // accepted for backward compatibility (treated as a fixed min=max).
  const legacyCount = searchParams.get('count')
  let minCount = parseInt(searchParams.get('min') ?? legacyCount ?? String(DEFAULT_MIN))
  let maxCount = parseInt(searchParams.get('max') ?? legacyCount ?? String(DEFAULT_MAX))
  if (!Number.isFinite(minCount)) minCount = DEFAULT_MIN
  if (!Number.isFinite(maxCount)) maxCount = DEFAULT_MAX
  maxCount = Math.min(Math.max(1, maxCount), 50)
  minCount = Math.min(Math.max(1, minCount), maxCount)
  const target = randInt(minCount, maxCount)

  if (!['nbdhe', 'jurisprudence'].includes(track)) {
    return NextResponse.json({ error: 'Invalid track' }, { status: 400 })
  }

  // ── 1. Standalone pool (fetched first so we know whether standalones exist) ──
  let standalonePool: SafeQuestion[] = []
  if (typeFilter === 'standalone' || typeFilter === 'both') {
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
    standalonePool = shuffle((pool ?? []) as unknown as SafeQuestion[])
  }
  const hasStandalones = standalonePool.length > 0

  // ── 2. Case sets and their questions ────────────────────────────────────────
  let caseSets: CaseSetWithImages[] = []
  const bySet = new Map<string, SafeQuestion[]>()
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
    caseSets = shuffle((rawCaseSets ?? []).map(cs => ({
      ...cs,
      images: ((cs.images ?? []) as CaseImage[]).sort((a, b) => a.display_order - b.display_order),
    })) as CaseSetWithImages[])

    const setIds = caseSets.map(c => c.id)
    if (setIds.length > 0) {
      let qQuery = adminClient
        .from('questions')
        .select(cols)
        .in('case_set_id', setIds)
        .eq('is_active', true)
        .order('sequence_order', { ascending: true })
      if (difficulty !== 'mixed') qQuery = qQuery.eq('difficulty', difficulty)

      const { data: allCaseQs } = await qQuery
      for (const q of (allCaseQs ?? []) as unknown as SafeQuestion[]) {
        const key = q.case_set_id as string
        const arr = bySet.get(key) ?? []
        arr.push(q)
        bySet.set(key, arr)
      }
    }
  }

  // ── 3. Decide the composition, keeping case groups whole ────────────────────
  const chosenBySet = new Map<string, SafeQuestion[]>()
  const chosenCaseCount = () => {
    let n = 0
    for (const arr of chosenBySet.values()) n += arr.length
    return n
  }

  // When standalones also exist, cap case questions at ~60% of the deck so
  // standalones get airtime; otherwise (case-only, or no standalones) let cases
  // fill the whole target.
  const caseCeil = (typeFilter === 'case' || !hasStandalones) ? target : Math.ceil(target * 0.6)

  // Pass A — one 2–3 question window per group, up to the case ceiling.
  for (const caseSet of caseSets) {
    if (chosenCaseCount() >= caseCeil) break
    const all = bySet.get(caseSet.id)
    if (!all || all.length === 0) continue
    let window = groupWindow(all)
    const room = caseCeil - chosenCaseCount()
    if (window.length > room) {
      if (room < 2 && all.length > 1) break // don't orphan a group to a single question
      window = window.slice(0, Math.max(1, room))
    }
    chosenBySet.set(caseSet.id, window)
  }

  // Standalones fill the rest up to the target.
  let standaloneTake = Math.max(0, target - chosenCaseCount())
  let standalones = standalonePool.slice(0, standaloneTake)

  // Pass B — if we're under the minimum (e.g. a group-heavy chapter with few
  // standalones), pull more: first unused groups, then extend existing groups.
  if (chosenCaseCount() + standalones.length < minCount) {
    for (const caseSet of caseSets) {
      if (chosenCaseCount() + standalones.length >= minCount) break
      if (chosenBySet.has(caseSet.id)) continue
      const all = bySet.get(caseSet.id)
      if (!all || all.length === 0) continue
      let window = groupWindow(all)
      const room = maxCount - (chosenCaseCount() + standalones.length)
      if (room < 1) break
      if (window.length > room) window = window.slice(0, room)
      chosenBySet.set(caseSet.id, window)
    }
    for (const caseSet of caseSets) {
      if (chosenCaseCount() + standalones.length >= minCount) break
      const all = bySet.get(caseSet.id)
      if (!all || all.length === 0) continue
      const chosen = chosenBySet.get(caseSet.id) ?? []
      const chosenIds = new Set(chosen.map(q => q.id))
      for (const q of all) {
        if (chosenIds.has(q.id)) continue
        if (chosenCaseCount() + standalones.length >= Math.min(minCount, maxCount)) break
        chosen.push(q)
      }
      chosen.sort((a, b) => ((a.sequence_order as number) ?? 0) - ((b.sequence_order as number) ?? 0))
      chosenBySet.set(caseSet.id, chosen)
    }
    // Top up standalones too if extending groups wasn't enough.
    standaloneTake = Math.min(standalonePool.length, Math.max(standaloneTake, maxCount - chosenCaseCount()))
    standalones = standalonePool.slice(0, standaloneTake)
  }

  // ── 4. Build response: each case group contiguous, then standalones ─────────
  const caseQuestions: SafeQuestion[] = []
  for (const caseSet of caseSets) {
    const chosen = chosenBySet.get(caseSet.id)
    if (!chosen || chosen.length === 0) continue
    for (const q of chosen) caseQuestions.push({ ...q, case_set: caseSet } as SafeQuestion)
  }

  return NextResponse.json([...caseQuestions, ...standalones])
}
