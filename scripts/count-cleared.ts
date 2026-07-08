import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { count: total } = await db.from('questions').select('*', { count: 'exact', head: true })
  const { count: active } = await db.from('questions').select('*', { count: 'exact', head: true }).eq('is_active', true)
  const { count: cleared } = await db.from('questions').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('is_legacy', false)
  const { count: legacy } = await db.from('questions').select('*', { count: 'exact', head: true }).eq('is_legacy', true)

  console.log('\n=== QUESTION BANK ===')
  console.log(`Total questions:            ${total}`)
  console.log(`Active:                     ${active}`)
  console.log(`Legacy (hidden now):        ${legacy}`)
  console.log(`CLEARED & live to users:    ${cleared}   <-- what candidates see`)

  // Cleared, broken down by track + chapter
  const { data: rows } = await db
    .from('questions')
    .select('track, chapter_tag')
    .eq('is_active', true)
    .eq('is_legacy', false)

  const byTrack: Record<string, number> = {}
  const byChapter: Record<string, number> = {}
  for (const r of rows ?? []) {
    byTrack[r.track] = (byTrack[r.track] ?? 0) + 1
    const tag = r.chapter_tag ?? '(sin capítulo)'
    byChapter[tag] = (byChapter[tag] ?? 0) + 1
  }

  console.log('\n--- cleared by track ---')
  for (const [t, c] of Object.entries(byTrack).sort((a, b) => b[1] - a[1])) console.log(`  ${t.padEnd(16)} ${c}`)

  console.log('\n--- cleared by chapter ---')
  const entries = Object.entries(byChapter).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) console.log('  (none cleared yet)')
  for (const [tag, c] of entries) console.log(`  ${tag.padEnd(18)} ${c}`)

  // Legacy backlog by chapter — where the cleanup work is
  const { data: legRows } = await db
    .from('questions')
    .select('chapter_tag')
    .eq('is_legacy', true)
  const legByChapter: Record<string, number> = {}
  for (const r of legRows ?? []) {
    const tag = r.chapter_tag ?? '(sin capítulo)'
    legByChapter[tag] = (legByChapter[tag] ?? 0) + 1
  }
  console.log('\n--- LEGACY backlog by chapter (to review) ---')
  for (const [tag, c] of Object.entries(legByChapter).sort((a, b) => b[1] - a[1])) console.log(`  ${tag.padEnd(18)} ${c}`)
}

main().catch(e => { console.error(e); process.exit(1) })
