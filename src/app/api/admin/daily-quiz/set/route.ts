import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentWeekNumber } from '@/lib/program-week'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { questionIds } = await req.json().catch(() => ({})) as { questionIds?: string[] }
  if (!questionIds || questionIds.length === 0) {
    return NextResponse.json({ error: 'Falta la lista de IDs de preguntas' }, { status: 400 })
  }

  const adminDb = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  const week = getCurrentWeekNumber()

  // Find if a daily quiz already exists for today
  const { data: existing } = await adminDb
    .from('daily_quizzes')
    .select('id, status')
    .eq('date', today)
    .maybeSingle()

  if (existing?.status === 'published') {
    return NextResponse.json(
      { error: 'Ya existe un quiz publicado para hoy. Reviértelo a borrador primero en el panel de Quiz del Día para sobrescribirlo.' },
      { status: 409 }
    )
  }

  if (existing) {
    // Update existing draft
    await adminDb
      .from('daily_quizzes')
      .update({ question_ids: questionIds, week_number: week, created_by: user.id, status: 'draft' })
      .eq('id', existing.id)
  } else {
    // Insert new daily quiz
    await adminDb
      .from('daily_quizzes')
      .insert({ date: today, week_number: week, question_ids: questionIds, created_by: user.id, status: 'draft' })
  }

  return NextResponse.json({ ok: true })
}
