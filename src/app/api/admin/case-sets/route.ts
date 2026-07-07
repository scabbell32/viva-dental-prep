import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') return null
  return user
}

// GET — list all case sets (optionally filtered by chapter_tag)
export async function GET(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()
  const { searchParams } = new URL(request.url)
  const chapterTag = searchParams.get('chapter_tag')

  let query = adminClient
    .from('case_sets')
    .select('*, images:case_images(id, image_url, caption, display_order)')
    .order('chapter_tag')
    .order('case_label')

  if (chapterTag) query = query.eq('chapter_tag', chapterTag)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — create a new case set
export async function POST(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { chapter_tag, week_number, track, case_label, case_type, description, patient_data } = body

  if (!chapter_tag || !case_label || !case_type) {
    return NextResponse.json({ error: 'chapter_tag, case_label, and case_type are required' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('case_sets')
    .insert({ chapter_tag, week_number: week_number || null, track: track || 'nbdhe', case_label, case_type, description: description || null, patient_data: patient_data || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
