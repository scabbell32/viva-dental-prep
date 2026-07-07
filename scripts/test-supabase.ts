import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('Testing Supabase connection...')
  // Test a simple select on questions
  const { data: q, error: selectErr } = await supabase.from('questions').select('id, correct_option').limit(1)
  if (selectErr) {
    console.error('Select error:', selectErr.message)
    return
  }
  console.log('Select successful! Sample question:', q)

  // Try to insert a dummy question with correct_option = 'e'
  console.log("Trying to insert dummy question with correct_option = 'e'...")
  const dummy = {
    track: 'nbdhe',
    week_number: 1,
    chapter_tag: 'ch3',
    question_text: 'Dummy test question for option E check constraint.',
    option_a: 'Option A',
    option_b: 'Option B',
    option_c: 'Option C',
    option_d: 'Option D',
    correct_option: 'e', // Let's see if this fails
    is_active: false // Keep it inactive
  }
  
  const { data, error } = await supabase.from('questions').insert(dummy).select()
  if (error) {
    console.log('Insert failed (as expected if check constraint is strict):', error.message)
  } else {
    console.log('Insert successful! Option E is supported in the database!', data)
    // Clean up
    if (data && data[0]) {
      await supabase.from('questions').delete().eq('id', data[0].id)
      console.log('Cleaned up dummy question.')
    }
  }
}

main().catch(console.error)
