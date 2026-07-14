import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentWeekNumber } from '@/lib/program-week'

const SAFE_COLUMNS = 'id, track, week_number, chapter_tag, question_text, option_a, option_b, option_c, option_d, option_e, option_f, correct_option, explanation, difficulty, image_url, image_urls, context_text, case_set_id, question_type, sequence_order, lock_option_order, question_text_es, option_a_es, option_b_es, option_c_es, option_d_es, option_e_es, option_f_es, explanation_es, case_set:case_sets(*, images:case_images(*))'

// GET — daily quiz for selected date (draft or published), or null
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const targetDate = searchParams.get('date') || new Date().toISOString().slice(0, 10)

  const adminDb = createAdminClient()

  const { data: quiz } = await adminDb
    .from('daily_quizzes')
    .select('*')
    .eq('date', targetDate)
    .maybeSingle()

  if (!quiz) return NextResponse.json(null)

  // Fetch full question data in the stored order
  const { data: questions } = await adminDb
    .from('questions')
    .select(SAFE_COLUMNS)
    .in('id', quiz.question_ids)

  // Re-sort to match stored order
  const orderedQuestions = quiz.question_ids
    .map((id: string) => questions?.find(q => q.id === id))
    .filter(Boolean)

  return NextResponse.json({ ...quiz, questions: orderedQuestions })
}

// POST — generate a new draft for a custom date (N random questions from current week pool)
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { count?: number; date?: string }
  const targetCount = Math.max(1, Math.min(50, body.count ?? 15))
  const targetDate = body.date || new Date().toISOString().slice(0, 10)

  const adminDb = createAdminClient()
  const week = getCurrentWeekNumber()

  // Don't overwrite a published quiz
  const { data: existing } = await adminDb
    .from('daily_quizzes')
    .select('id, status')
    .eq('date', targetDate)
    .maybeSingle()

  if (existing?.status === 'published') {
    return NextResponse.json({ error: 'Ya existe un quiz publicado para hoy.' }, { status: 409 })
  }

  // Fetch candidate pool
  const { data: pool } = await adminDb
    .from('questions')
    .select('id')
    .eq('track', 'nbdhe')
    .eq('is_active', true)
    .lte('week_number', week)
    .order('week_number', { ascending: false })
    .limit(50)

  if (!pool || pool.length === 0) {
    return NextResponse.json({ error: 'No hay preguntas disponibles.' }, { status: 422 })
  }

  const shuffled = pool.sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, Math.min(targetCount, shuffled.length)).map(q => q.id)

  if (existing) {
    // Update existing draft
    await adminDb
      .from('daily_quizzes')
      .update({ question_ids: selected, week_number: week, created_by: user.id })
      .eq('id', existing.id)
  } else {
    await adminDb
      .from('daily_quizzes')
      .insert({ date: targetDate, week_number: week, question_ids: selected, created_by: user.id })
  }

  return NextResponse.json({ ok: true })
}
