import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('study_stack_items')
    .select('id, question_id, status, teaching_script, created_at')
    .eq('candidate_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ items: data ?? [] })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await supabase.from('study_stack_items').delete().eq('id', id).eq('candidate_id', user.id)
  return NextResponse.json({ ok: true })
}
