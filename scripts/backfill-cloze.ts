// Converts legacy cloze_text (_____) + cloze_answers[] rows to the structured cloze JSONB column.
// Run once after applying migration 20260709_cloze_structured.sql.
// Safe to re-run: skips rows that already have cloze set.
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data: exercises, error } = await supabase
    .from('listening_exercises')
    .select('id, cloze_text, cloze_answers, cloze')
    .is('cloze', null)

  if (error) { console.error('Fetch error:', error.message); process.exit(1) }
  if (!exercises || exercises.length === 0) { console.log('No rows to backfill.'); return }

  console.log(`Backfilling ${exercises.length} exercises...`)

  for (const ex of exercises) {
    const raw: string = ex.cloze_text ?? ''
    const answers: string[] = Array.isArray(ex.cloze_answers) ? ex.cloze_answers : []

    // Replace each _____ with {0}, {1}, ... in order
    let idx = 0
    const text = raw.replace(/_____/g, () => `{${idx++}}`)
    const blanks = answers.map((answer, i) => ({
      index: i,
      answer: answer.trim(),
      accept: [answer.trim()],
    }))

    const { error: updateErr } = await supabase
      .from('listening_exercises')
      .update({ cloze: { text, blanks } })
      .eq('id', ex.id)

    if (updateErr) {
      console.error(`  ❌ Failed to update ${ex.id}:`, updateErr.message)
    } else {
      console.log(`  ✅ Backfilled exercise ${ex.id} (${blanks.length} blanks)`)
    }
  }

  console.log('Done.')
}

main().catch(console.error)
