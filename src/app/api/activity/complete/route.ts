import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { activity_type, week_number }: { activity_type: string; week_number: number } = await request.json()

  if (!['vocab', 'listening'].includes(activity_type) || !week_number) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Upsert — conflict on (candidate_id, activity_type, week_number) does nothing
  const { error } = await supabase
    .from('activity_completions')
    .upsert(
      { candidate_id: user.id, activity_type, week_number },
      { onConflict: 'candidate_id,activity_type,week_number', ignoreDuplicates: true }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
