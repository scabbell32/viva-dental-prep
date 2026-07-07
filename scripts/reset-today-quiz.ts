import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../.env.local') })

import { createAdminClient } from '../src/lib/supabase/admin'

async function main() {
  const adminDb = createAdminClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const ids = [
    '64fbac67-0305-4c8b-8e6a-9ed695e64ad0',
    'a228e422-7a1e-4659-b935-d041fef92c69',
  ]

  for (const id of ids) {
    const { data, error } = await adminDb
      .from('quiz_attempts')
      .delete()
      .eq('candidate_id', id)
      .gte('completed_at', today.toISOString())
      .select('id')
    if (error) console.log('Error for', id, error.message)
    else console.log('Deleted', data?.length ?? 0, 'attempt(s) for', id)
  }
}

main()
