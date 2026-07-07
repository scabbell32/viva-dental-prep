import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') return null
  return user
}

// POST — assign questions to a case set
// Body: { assignments: [{ question_id, sequence_order }] }
// Send an empty assignments array to unlink all questions from this case set.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { assignments } = await request.json() as {
    assignments: { question_id: string; sequence_order: number }[]
  }

  const adminClient = createAdminClient()

  // Unlink any questions currently assigned to this case set that are not in the new list
  const keepIds = assignments.map(a => a.question_id)
  let unlinkQuery = adminClient
    .from('questions')
    .update({ case_set_id: null, question_type: 'standalone', sequence_order: null })
    .eq('case_set_id', id)

  if (keepIds.length > 0) {
    unlinkQuery = unlinkQuery.not('id', 'in', `(${keepIds.join(',')})`)
  }
  await unlinkQuery

  // Apply the new assignments
  for (const { question_id, sequence_order } of assignments) {
    await adminClient
      .from('questions')
      .update({ case_set_id: id, question_type: 'case', sequence_order })
      .eq('id', question_id)
  }

  return NextResponse.json({ ok: true, assigned: assignments.length })
}
