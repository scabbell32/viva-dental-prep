import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const OLD_CANDIDATE_EMAILS = [
  'maria.garcia@vivadental.test',
  'carlos.rodriguez@vivadental.test',
  'ana.lopez@vivadental.test',
  'jose.martinez@vivadental.test'
]

const NEW_CANDIDATES = [
  {
    name: 'Nancy Matiz Enriquez',
    email: 'uniodontomatiz@hotmail.com',
    phone: '3177462354',
    country: 'Colombia',
    password: 'n2354'
  },
  {
    name: 'Ilmary Castillo',
    email: 'ilmaryrcc@gmail.com',
    phone: '3173842399',
    country: 'Venezuela',
    password: 'i2399'
  },
  {
    name: 'Dr. Rodolfo Christopher Loza',
    email: 'rocrip_88@hotmail.com',
    phone: '3177444144',
    country: 'Nicaragua',
    password: 'r4144'
  },
  {
    name: 'Shawn Cabbell',
    email: 'scabbell@me.com',
    phone: '3173612745',
    country: 'USA',
    password: 's2745'
  }
]

async function main() {
  console.log('=== Reseeding Candidates Database ===')

  // 1. Fetch current auth users
  console.log('Fetching existing auth accounts...')
  const { data: { users }, error: fetchError } = await supabase.auth.admin.listUsers()
  if (fetchError) {
    console.error('Error fetching users:', fetchError.message)
    return
  }

  // 2. Delete old candidates
  console.log('Deleting placeholder candidate accounts...')
  for (const u of users) {
    if (u.email && OLD_CANDIDATE_EMAILS.includes(u.email)) {
      console.log(`- Deleting: ${u.email}...`)
      // Note: Cascade on delete trigger in Supabase will automatically clean up the profiles table too!
      const { error: deleteError } = await supabase.auth.admin.deleteUser(u.id)
      if (deleteError) {
        console.error(`  Failed to delete ${u.email}:`, deleteError.message)
      } else {
        console.log(`  Deleted successfully.`)
      }
    }
  }

  // 3. Insert new candidates
  console.log('\nCreating new candidate accounts...')
  for (const nc of NEW_CANDIDATES) {
    console.log(`- Creating: ${nc.name} (${nc.email})...`)
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: nc.email,
      password: nc.password,
      email_confirm: true,
      user_metadata: {
        full_name: nc.name,
        role: 'candidate'
      }
    })

    if (createError) {
      console.error(`  Failed to create auth user ${nc.email}:`, createError.message)
      continue
    }

    if (userData?.user) {
      console.log(`  Auth user created with ID: ${userData.user.id}`)
      
      // Update the profile with country details
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          country: nc.country,
          english_level: 'beginner',
          phone: nc.phone
        })
        .eq('id', userData.user.id)

      if (profileError) {
        console.error(`  Failed to update profile country for ${nc.name}:`, profileError.message)
      } else {
        console.log(`  Profile updated successfully with country: ${nc.country}`)
      }
    }
  }

  console.log('\n=== Reseeding Candidates Complete! ===')
}

main().catch(console.error)
