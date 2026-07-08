import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const VALID_REASONS = ['garbled', 'wrong_answer', 'duplicate_options', 'other']

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question_id, reason }: { question_id?: string; reason?: string } = await request.json()
  if (!question_id) return NextResponse.json({ error: 'question_id required' }, { status: 400 })

  const safeReason = reason && VALID_REASONS.includes(reason) ? reason : 'other'

  const { error } = await supabase
    .from('question_reports')
    .insert({ question_id, candidate_id: user.id, reason: safeReason })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
