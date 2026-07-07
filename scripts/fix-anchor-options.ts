/**
 * Finds questions where an "all/none of the above" style option is NOT in position D,
 * swaps it to position D, and updates correct_option accordingly.
 * Safe to run multiple times (idempotent).
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Phrases that should always be displayed last
const ANCHOR_PHRASES = [
  'all of the above',
  'none of the above',
  'all of these',
  'none of these',
  'both of the above',
  'both a and b',
  'todas las anteriores',
  'ninguna de las anteriores',
  'todas las opciones anteriores',
  'ninguna de las opciones anteriores',
  'todas las respuestas',
  'ninguna de las respuestas',
]

function isAnchor(text: string | null): boolean {
  if (!text) return false
  const lower = text.toLowerCase().trim()
  return ANCHOR_PHRASES.some(p => lower.includes(p))
}

type OptKey = 'a' | 'b' | 'c' | 'd'

function findAnchorSlot(q: Record<string, string | null>): OptKey | null {
  for (const slot of ['a', 'b', 'c'] as OptKey[]) {  // only check a/b/c — d is already last
    if (isAnchor(q[`option_${slot}`]) || isAnchor(q[`option_${slot}_es`])) {
      return slot
    }
  }
  return null
}

function swapOptionKeys(correct: string, from: OptKey, to: OptKey): string {
  if (correct === from) return to
  if (correct === to) return from
  return correct
}

async function main() {
  console.log('=== Fixing anchor options (All/None of the above) ===\n')

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, option_a, option_b, option_c, option_d, option_a_es, option_b_es, option_c_es, option_d_es, correct_option, question_text')
    .eq('is_active', true)

  if (error) { console.error('Fetch error:', error.message); return }

  let fixed = 0
  let skipped = 0

  for (const q of questions ?? []) {
    const anchorSlot = findAnchorSlot(q)
    if (!anchorSlot) { skipped++; continue }

    // anchorSlot is the position that should be swapped to 'd'
    const swapSlot = 'd' as OptKey

    const update: Record<string, string | null> = {
      [`option_${swapSlot}`]:    q[`option_${anchorSlot}`],
      [`option_${anchorSlot}`]:  q[`option_${swapSlot}`],
      [`option_${swapSlot}_es`]: q[`option_${anchorSlot}_es`],
      [`option_${anchorSlot}_es`]: q[`option_${swapSlot}_es`],
      correct_option: swapOptionKeys(q.correct_option, anchorSlot, swapSlot),
    }

    const label = q.question_text?.slice(0, 60)
    console.log(`Fixing: "${label}..."`)
    console.log(`  Swapping option_${anchorSlot} ↔ option_${swapSlot}`)
    if (q.correct_option !== update.correct_option) {
      console.log(`  correct_option: ${q.correct_option} → ${update.correct_option}`)
    }

    const { error: updateErr } = await supabase
      .from('questions')
      .update(update)
      .eq('id', q.id)

    if (updateErr) {
      console.error(`  ERROR: ${updateErr.message}`)
    } else {
      console.log(`  ✓ Updated`)
      fixed++
    }
  }

  console.log(`\n=== Done: ${fixed} fixed, ${skipped} already correct ===`)
}

main().catch(console.error)
