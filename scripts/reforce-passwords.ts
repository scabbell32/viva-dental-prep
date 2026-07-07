import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const USER_PASSWORDS: Record<string, string> = {
  'uniodontomatiz@hotmail.com': 'vn2354',
  'ilmaryrcc@gmail.com': 'vi2399',
  'rocrip_88@hotmail.com': 'vr4144',
  'scabbell@me.com': 'vs2745',
  's.cabbell@comcast.net': 'viva1234!',
  'admin@vivadental.test': 'viva1234!'
}

async function main() {
  console.log('Fetching users from Supabase Auth...')
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  
  if (error) {
    console.error('Error fetching users:', error.message)
    return
  }

  console.log(`Setting passwords and confirming emails for ${users.length} users...\n`)
  
  for (const u of users) {
    if (!u.email) continue
    const targetPassword = USER_PASSWORDS[u.email.toLowerCase()]
    
    if (!targetPassword) {
      console.log(`- Skipping user ${u.email} (no password mapped)`)
      continue
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      u.id,
      { 
        password: targetPassword,
        email_confirm: true // Force confirmation so they can log in
      }
    )
    
    if (updateError) {
      console.error(`- Failed to update ${u.email}:`, updateError.message)
    } else {
      console.log(`- Successfully set password for ${u.email} to: "${targetPassword}" (email confirmed: true)`)
    }
  }
  
  console.log('\nAll user credentials updated successfully!')
}

main().catch(console.error)
