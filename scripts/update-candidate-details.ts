import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CANDIDATES = [
  { email: 'uniodontomatiz@hotmail.com', phone: '3177462354', country: 'Colombia' },
  { email: 'ilmaryrcc@gmail.com', phone: '3173842399', country: 'Venezuela' },
  { email: 'rocrip_88@hotmail.com', phone: '3177444144', country: 'Nicaragua' },
  { email: 'scabbell@me.com', phone: '3173612745', country: 'USA' }
]

async function main() {
  console.log('=== Updating Candidate Profile Database Fields ===')
  
  const { data: { users }, error: fetchError } = await supabase.auth.admin.listUsers()
  if (fetchError) {
    console.error('Error fetching users:', fetchError.message)
    return
  }
  
  for (const c of CANDIDATES) {
    const user = users.find(u => u.email === c.email)
    if (!user) {
      console.log(`- User with email ${c.email} not found in auth.`)
      continue
    }
    
    console.log(`- Updating profile for: ${c.email}...`)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        country: c.country,
        phone: c.phone
      })
      .eq('id', user.id)
      
    if (profileError) {
      console.error(`  Failed to update profile:`, profileError.message)
    } else {
      console.log(`  Profile updated successfully with country: ${c.country}, phone: ${c.phone}`)
    }
  }
  
  console.log('\n=== Update Complete! ===')
}

main().catch(console.error)
