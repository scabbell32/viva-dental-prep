import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DEFAULT_PASSWORD = 'viva1234!'

async function main() {
  console.log('Fetching auth users...')
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  
  if (error) {
    console.error('Error fetching users:', error.message)
    return
  }
  
  console.log(`Resetting passwords for ${users.length} users to "${DEFAULT_PASSWORD}"...\n`)
  
  for (const u of users) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      u.id,
      { password: DEFAULT_PASSWORD }
    )
    
    if (updateError) {
      console.error(`- Failed to reset password for ${u.email}:`, updateError.message)
    } else {
      console.log(`- Successfully reset password for: ${u.email}`)
    }
  }
  
  console.log('\nAll passwords reset complete!')
}

main().catch(console.error)
