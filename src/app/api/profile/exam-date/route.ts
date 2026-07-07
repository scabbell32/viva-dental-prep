import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { exam_date?: string }
  const examDate = body.exam_date?.match(/^\d{4}-\d{2}-\d{2}$/) ? body.exam_date : null

  const adminDb = createAdminClient()
  const { error } = await adminDb
    .from('profiles')
    .update({ exam_date: examDate })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
