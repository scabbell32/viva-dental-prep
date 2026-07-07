import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('Querying users from Supabase Auth & Profiles...')
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
  if (authError) {
    console.error('Error fetching auth users:', authError.message)
    return
  }

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role, english_level, country, created_at')
  
  if (profileError) {
    console.error('Error fetching profiles:', profileError.message)
    return
  }

  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))

  console.log(`Total auth users in database: ${users.length}`)
  console.log('\nUser List:')
  for (const u of users) {
    const prof = profileMap[u.id]
    console.log(`- Email: "${u.email}" | Name: "${prof?.full_name ?? 'N/A'}" | Role: "${prof?.role ?? 'candidate'}" | ID: ${u.id}`)
  }
}

main().catch(console.error)
