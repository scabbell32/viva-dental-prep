import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data: rows } = await db
    .from('questions')
    .select('id, case_set_id, sequence_order, is_legacy, is_active')

  const groups: Record<string, { total: number; cleared: number; active: number }> = {}
  let standaloneTotal = 0
  let standaloneCleared = 0
  for (const r of rows ?? []) {
    if (!r.case_set_id) {
      standaloneTotal++
      if (!r.is_legacy && r.is_active) standaloneCleared++
      continue
    }
    if (!groups[r.case_set_id]) groups[r.case_set_id] = { total: 0, cleared: 0, active: 0 }
    groups[r.case_set_id].total++
    if (r.is_active) groups[r.case_set_id].active++
    if (!r.is_legacy && r.is_active) groups[r.case_set_id].cleared++
  }

  const groupList = Object.entries(groups)
  console.log(`\nStandalone questions:   ${standaloneTotal} (cleared: ${standaloneCleared})`)
  console.log(`Case-set groups:        ${groupList.length}`)

  // Distribution of group sizes
  const sizes = groupList.map(([, g]) => g.total).sort((a, b) => b - a)
  console.log(`Group sizes (total questions per group), largest first:`)
  console.log('  ', sizes.join(', '))

  console.log(`\nGroups that have at least one CLEARED (live) question:`)
  const liveGroups = groupList.filter(([, g]) => g.cleared > 0)
  if (liveGroups.length === 0) console.log('  (none yet — all grouped questions are still legacy)')
  for (const [id, g] of liveGroups) {
    console.log(`   ${id.slice(0, 8)}  total=${g.total}  cleared/live=${g.cleared}`)
  }

  // Fetch case_set labels for context
  const { data: sets } = await db.from('case_sets').select('id, case_label, chapter_tag')
  const labelMap = new Map((sets ?? []).map(s => [s.id, `${s.chapter_tag}/${s.case_label}`]))
  console.log(`\nTotal case_sets defined: ${sets?.length ?? 0}`)
  console.log('Sample labels:', (sets ?? []).slice(0, 8).map(s => labelMap.get(s.id)).join(' | '))
}

main().catch(e => { console.error(e); process.exit(1) })
