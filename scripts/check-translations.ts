import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../.env.local') })

import { createAdminClient } from '../src/lib/supabase/admin'

async function main() {
  const adminDb = createAdminClient()

  const { count: total } = await adminDb
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { count: translated } = await adminDb
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('question_text_es', 'is', null)

  console.log(`Total active: ${total}`)
  console.log(`Translated:   ${translated}`)
  console.log(`Remaining:    ${(total ?? 0) - (translated ?? 0)}`)

  // Show week breakdown for untranslated
  const { data: untranslated } = await adminDb
    .from('questions')
    .select('week_number')
    .eq('is_active', true)
    .is('question_text_es', null)
    .order('week_number')

  const byWeek: Record<number, number> = {}
  for (const q of untranslated ?? []) {
    byWeek[q.week_number] = (byWeek[q.week_number] ?? 0) + 1
  }
  if (Object.keys(byWeek).length > 0) {
    console.log('\nUntranslated by week:')
    for (const [wk, cnt] of Object.entries(byWeek)) {
      console.log(`  Week ${wk}: ${cnt}`)
    }
  }
}

main()
