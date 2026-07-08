import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/daily-quiz/pool?exclude=id1,id2,...
// Returns questions from the current week pool that are NOT in the current quiz
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const exclude = req.nextUrl.searchParams.get('exclude')?.split(',').filter(Boolean) ?? []
  const search = req.nextUrl.searchParams.get('search')?.trim() || ''
  const track = req.nextUrl.searchParams.get('track') || 'all'
  const weekNumber = req.nextUrl.searchParams.get('week_number') || 'all'
  const isLegacy = req.nextUrl.searchParams.get('is_legacy') || 'all'
  const hasExplanation = req.nextUrl.searchParams.get('has_explanation') || 'all'
  const sort = req.nextUrl.searchParams.get('sort') || 'recent_added'

  const adminDb = createAdminClient()
  let query = adminDb.from('questions').select('*', { count: 'exact' })

  // Apply filters
  if (track !== 'all') {
    query = query.eq('track', track)
  }
  if (weekNumber !== 'all') {
    query = query.eq('week_number', parseInt(weekNumber))
  }
  if (isLegacy !== 'all') {
    query = query.eq('is_legacy', isLegacy === 'legacy')
  }
  if (hasExplanation !== 'all') {
    if (hasExplanation === 'yes') {
      query = query.not('explanation', 'is', null).neq('explanation', '')
    } else {
      query = query.or('explanation.is.null,explanation.eq.""')
    }
  }
  if (search) {
    query = query.or(`question_text.ilike.%${search}%,chapter_tag.ilike.%${search}%`)
  }

  // Active status
  query = query.eq('is_active', true)

  // Apply sorting
  if (sort === 'recent_added') {
    query = query.order('created_at', { ascending: false })
  } else if (sort === 'recent_edited') {
    // Fallback order: sort by updated_at, which defaults to now()
    query = query.order('updated_at', { ascending: false })
  } else {
    query = query.order('week_number', { ascending: false })
  }

  // Fetch count and limited results
  const { data, count, error } = await query.limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter out excluded IDs locally
  const pool = (data ?? []).filter(q => !exclude.includes(q.id))

  return NextResponse.json({ pool, totalCount: count ?? pool.length })
}
