import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { error, count } = await db.from('question_reports').select('*', { count: 'exact', head: true })
  if (error) { console.log('❌ question_reports NOT reachable:', error.message); process.exit(1) }
  console.log(`✅ question_reports table exists — ${count ?? 0} report(s) so far.`)

  // Confirm we can resolve/read the columns by selecting one row shape
  const { data, error: e2 } = await db.from('question_reports').select('id, question_id, candidate_id, reason, status, created_at').limit(1)
  if (e2) { console.log('❌ column check failed:', e2.message); process.exit(1) }
  console.log('✅ columns present: id, question_id, candidate_id, reason, status, created_at')
  if ((data ?? []).length) console.log('   sample:', JSON.stringify(data![0]))
}
main().catch(e => { console.error(e); process.exit(1) })
