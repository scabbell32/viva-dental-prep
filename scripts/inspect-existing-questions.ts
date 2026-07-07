import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('Querying exact count of questions in Supabase...')
  const { count, error: countErr } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
  
  if (countErr) {
    console.error('Error fetching count:', countErr.message)
    return
  }
  
  console.log(`Total questions in database (exact count): ${count}`)
  
  // Fetch all rows in chunks to get the actual breakdown
  let allData: any[] = []
  let page = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('questions')
      .select('id, week_number, chapter_tag, track')
      .range(page * pageSize, (page + 1) * pageSize - 1)
      
    if (error) {
      console.error('Error fetching chunk:', error.message)
      break
    }
    if (!data || data.length === 0) break
    allData.push(...data)
    if (data.length < pageSize) break
    page++
  }
  
  console.log(`Successfully fetched breakdown for all ${allData.length} questions.`)
  
  const counts: Record<string, number> = {}
  for (const q of allData) {
    const key = `Week ${q.week_number} | Tag: ${q.chapter_tag || 'none'} | Track: ${q.track}`
    counts[key] = (counts[key] || 0) + 1
  }
  
  console.log('\nQuestions count by Week and Chapter Tag:')
  for (const [key, count] of Object.entries(counts).sort()) {
    console.log(`  ${key}: ${count} questions`)
  }
}

main().catch(console.error)
