import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function check() {
  // Today's attempts
  const today = new Date().toISOString().slice(0,10)
  const { data: attempts } = await db.from('quiz_attempts').select('candidate_id, track, score, total_questions, completed_at').gte('completed_at', today)
  console.log('Attempts today:', JSON.stringify(attempts, null, 2))

  // Check quiz_attempts table structure
  const { data: cols } = await db.rpc('sql', { query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='quiz_attempts' ORDER BY ordinal_position" }).single() as any
  console.log('\nquiz_attempts columns:', cols)

  // Check question_results table exists
  const { data: qr, error: qrErr } = await db.from('question_results').select('id').limit(1)
  console.log('\nquestion_results accessible:', qrErr ? `ERROR: ${qrErr.message}` : 'yes')

  // Check RLS on questions table for candidate
  const { data: q, error: qErr } = await db.from('questions').select('id').limit(1)
  console.log('questions accessible (admin):', qErr ? `ERROR: ${qErr.message}` : `yes (${q?.length} row)`)
}
check().catch(console.error)
