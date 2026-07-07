import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentWeekNumber } from '@/lib/program-week'

// GET /api/admin/daily-quiz/pool?exclude=id1,id2,...
// Returns questions from the current week pool that are NOT in the current quiz
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const exclude = req.nextUrl.searchParams.get('exclude')?.split(',').filter(Boolean) ?? []
  const week = getCurrentWeekNumber()
  const adminDb = createAdminClient()

  const { data } = await adminDb
    .from('questions')
    .select('id, week_number, chapter_tag, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, image_url, image_urls')
    .eq('track', 'nbdhe')
    .eq('is_active', true)
    .lte('week_number', week)
    .order('week_number', { ascending: false })
    .limit(100)

  const pool = (data ?? []).filter(q => !exclude.includes(q.id))

  return NextResponse.json(pool)
}
