import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../.env.local') })

import { createAdminClient } from '../src/lib/supabase/admin'

async function main() {
  const adminDb = createAdminClient()

  // Try the exact query the submit route uses
  const { data, error } = await adminDb
    .from('questions')
    .select('id, track, chapter_tag, correct_option, explanation, explanation_es')
    .limit(1)

  if (error) {
    console.log('ERROR selecting questions with explanation_es:', error.message)
  } else {
    console.log('SELECT succeeded, columns present:', data && data[0] ? Object.keys(data[0]) : '(no rows)')
  }

  // Also check what columns questions actually has
  const { data: sample, error: err2 } = await adminDb
    .from('questions')
    .select('*')
    .limit(1)

  if (err2) {
    console.log('ERROR on select *:', err2.message)
  } else {
    console.log('All question columns:', sample && sample[0] ? Object.keys(sample[0]) : '(no rows)')
  }
}

main()
