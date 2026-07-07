/**
 * Calls the live /api/quiz/submit endpoint to see what error it returns.
 * Uses the Supabase anon key to simulate what the browser would do (minus the auth cookie).
 */
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../.env.local') })

import { createAdminClient } from '../src/lib/supabase/admin'

async function main() {
  const adminDb = createAdminClient()

  // Get 15 real question IDs
  const { data: questions } = await adminDb
    .from('questions')
    .select('id, correct_option')
    .eq('track', 'nbdhe')
    .eq('is_active', true)
    .limit(15)

  if (!questions?.length) { console.log('No questions found'); return }

  const answers = questions.map(q => ({
    question_id: q.id,
    selected_option: q.correct_option,
    used_translation: false,
  }))

  console.log(`Sending ${answers.length} answers to /api/quiz/submit`)

  // Call the live dev server (no auth cookie — expect 401 or redirect)
  const res = await fetch('http://localhost:3000/api/quiz/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ track: 'nbdhe', week_number: 1, answers, mode: 'weekly' }),
  })

  console.log('Status:', res.status, res.statusText)
  const body = await res.text()
  console.log('Body (first 500 chars):', body.slice(0, 500))
}

main()
