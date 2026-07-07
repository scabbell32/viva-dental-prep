#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (let c = 0; c < line.length; c++) {
      if (line[c] === '"') inQuotes = !inQuotes
      else if (line[c] === ',' && !inQuotes) { values.push(current.trim()); current = '' }
      else current += line[c]
    }
    values.push(current.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] ?? '' })
    rows.push(row)
  }
  return rows
}

async function main() {
  const csvPath = path.join(__dirname, 'histology-week1.csv')
  const text = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(text)

  let inserted = 0
  let skipped = 0

  for (const row of rows) {
    const { error } = await supabase.from('questions').insert({
      question_text: row['question_text'],
      option_a: row['option_a'],
      option_b: row['option_b'],
      option_c: row['option_c'],
      option_d: row['option_d'],
      correct_option: row['correct_option'],
      explanation: row['explanation'] || null,
      difficulty: row['difficulty'] || 'medium',
      track: row['track'],
      week_number: parseInt(row['week_number']),
      chapter_tag: row['chapter_tag'] || null,
      is_active: true,
    })
    if (error) {
      console.error(`  Insert error: ${error.message}`)
      skipped++
    } else {
      inserted++
    }
  }

  console.log(`Done. Inserted ${inserted}, skipped ${skipped}.`)
}

main().catch(console.error)
