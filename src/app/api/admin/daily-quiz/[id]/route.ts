import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SAFE_COLUMNS = 'id, track, week_number, chapter_tag, question_text, option_a, option_b, option_c, option_d, option_e, option_f, correct_option, explanation, difficulty, image_url, image_urls, case_set_id, question_type, sequence_order, lock_option_order, question_text_es, option_a_es, option_b_es, option_c_es, option_d_es, option_e_es, option_f_es, explanation_es, case_set:case_sets(*, images:case_images(*))'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') return null
  return user
}

// PATCH — update question list: { action: 'remove', questionId } | { action: 'add', questionId }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { action, questionId } = await req.json()
  const adminDb = createAdminClient()

  const { data: quiz } = await adminDb
    .from('daily_quizzes')
    .select('id, question_ids, status')
    .eq('id', id)
    .single()

  if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (quiz.status === 'published') return NextResponse.json({ error: 'Cannot edit a published quiz.' }, { status: 409 })

  let updated: string[] = quiz.question_ids ?? []

  if (action === 'remove') {
    updated = updated.filter((qid: string) => qid !== questionId)
  } else if (action === 'add') {
    if (!updated.includes(questionId)) updated = [...updated, questionId]
  } else if (action === 'reorder') {
    // { action: 'reorder', questionIds: string[] }
    const { questionIds } = await req.json().catch(() => ({})) as { questionIds?: string[] }
    if (questionIds) updated = questionIds
  }

  await adminDb.from('daily_quizzes').update({ question_ids: updated }).eq('id', id)

  // Return updated question objects
  const { data: questions } = await adminDb
    .from('questions')
    .select(SAFE_COLUMNS)
    .in('id', updated)

  const ordered = updated.map((qid: string) => questions?.find(q => q.id === qid)).filter(Boolean)

  return NextResponse.json({ question_ids: updated, questions: ordered })
}

// POST /[id]/publish
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({})) as { action?: string }

  const adminDb = createAdminClient()

  if (body.action === 'publish') {
    await adminDb.from('daily_quizzes').update({ status: 'published' }).eq('id', id)
    return NextResponse.json({ ok: true, status: 'published' })
  }
  if (body.action === 'unpublish') {
    await adminDb.from('daily_quizzes').update({ status: 'draft' }).eq('id', id)
    return NextResponse.json({ ok: true, status: 'draft' })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
