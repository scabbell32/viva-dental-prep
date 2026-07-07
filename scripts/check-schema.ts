import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../.env.local') })

import { createAdminClient } from '../src/lib/supabase/admin'

async function main() {
  const adminDb = createAdminClient()

  // Check quiz_attempts columns via a SELECT on information_schema
  const { data, error } = await adminDb
    .from('quiz_attempts')
    .select('*')
    .limit(1)

  if (error) {
    console.log('Error fetching quiz_attempts:', error.message)
    return
  }

  console.log('quiz_attempts sample row keys:', data && data[0] ? Object.keys(data[0]) : '(no rows)')

  // Try inserting a minimal test row (will fail but shows the real error)
  const testUserId = '64fbac67-0305-4c8b-8e6a-9ed695e64ad0'
  const { error: insertError } = await adminDb
    .from('quiz_attempts')
    .insert({
      candidate_id: testUserId,
      track: 'nbdhe',
      week_number: 1,
      score: 0,
      total_questions: 1,
      translation_reveals: 0,
      mode: 'weekly',
      answers: [],
    })
    .select()
    .single()

  if (insertError) {
    console.log('Insert error:', insertError.message, insertError.details, insertError.hint)
  } else {
    console.log('Test insert succeeded — all columns exist')
    // Clean it up
    await adminDb.from('quiz_attempts').delete().eq('candidate_id', testUserId).eq('score', 0).eq('total_questions', 1)
    console.log('Test row cleaned up')
  }
}

main()
