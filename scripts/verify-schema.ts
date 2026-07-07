import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('Verifying Supabase schema changes...')

  // 1. Verify case_studies table
  console.log('Checking "case_studies" table...')
  const { data: cases, error: caseErr } = await supabase
    .from('case_studies')
    .select('id, title, title_es, synopsis, synopsis_es')
    .limit(1)

  if (caseErr) {
    console.error('❌ "case_studies" table check failed:', caseErr.message)
    console.log('Ensure you ran the SQL script in your Supabase SQL Editor.')
    process.exit(1)
  }
  console.log('✅ "case_studies" table exists and columns are valid!')

  // 2. Verify questions table new columns
  console.log('\nChecking "questions" table new columns...')
  const { data: qs, error: qErr } = await supabase
    .from('questions')
    .select('id, case_study_id, image_url, question_text_es, option_a_es, option_b_es, option_c_es, option_d_es, explanation_es')
    .limit(1)

  if (qErr) {
    console.error('❌ "questions" table columns check failed:', qErr.message)
    console.log('Ensure you ran the SQL script in your Supabase SQL Editor.')
    process.exit(1)
  }
  console.log('✅ "questions" table new columns exist and are queryable!')

  console.log('\n🎉 DATABASE MIGRATION VERIFIED SUCCESSFULLY!')
}

main().catch(console.error)
