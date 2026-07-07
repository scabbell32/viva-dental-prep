import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('Querying profiles in Supabase...')
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, english_level, country, created_at')
  
  if (error) {
    console.error('Error fetching profiles:', error.message)
    return
  }
  
  console.log(`Total users in database: ${data.length}`)
  console.log('\nUser Profiles:')
  for (const u of data) {
    console.log(`- Name: "${u.full_name}" | Role: "${u.role}" | Level: "${u.english_level || 'none'}" | ID: ${u.id}`)
  }
}

main().catch(console.error)
