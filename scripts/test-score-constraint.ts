import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../.env.local') })

import { createAdminClient } from '../src/lib/supabase/admin'

async function main() {
  const adminDb = createAdminClient()
  const userId = '64fbac67-0305-4c8b-8e6a-9ed695e64ad0'

  for (const score of [10, 11, 13, 15]) {
    const { error } = await adminDb
      .from('quiz_attempts')
      .insert({
        candidate_id: userId,
        track: 'nbdhe',
        week_number: 1,
        score,
        total_questions: 15,
        translation_reveals: 0,
        mode: 'weekly',
        answers: [],
      })
      .select('id')
      .single()

    if (error) {
      console.log(`score=${score}/15 → FAIL: ${error.message}`)
    } else {
      console.log(`score=${score}/15 → OK`)
    }
  }

  // Clean up
  await adminDb.from('quiz_attempts').delete().eq('candidate_id', userId).eq('week_number', 1)
  console.log('Cleaned up test rows')
}

main()
