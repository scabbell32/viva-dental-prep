import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('Querying Auth Users from Supabase...')
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  
  if (error) {
    console.error('Error fetching auth users:', error.message)
    return
  }
  
  console.log(`Found ${users.length} auth accounts.\n`)
  for (const u of users) {
    const role = u.user_metadata?.role || 'candidate'
    const name = u.user_metadata?.full_name || 'No Name'
    console.log(`- Email: ${u.email} | Name: "${name}" | Role: "${role}" | ID: ${u.id}`)
  }
}

main().catch(console.error)
