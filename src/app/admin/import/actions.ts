'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ImportResult = { inserted: number; skipped: number; errors: string[] }

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Handle quoted fields with commas inside
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (let c = 0; c < line.length; c++) {
      if (line[c] === '"') {
        inQuotes = !inQuotes
      } else if (line[c] === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += line[c]
      }
    }
    values.push(current.trim())

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] ?? '' })
    rows.push(row)
  }
  return rows
}

export async function importQuestions(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    return { inserted: 0, skipped: 0, errors: ['No autorizado.'] }
  }

  const file = formData.get('file') as File | null
  if (!file) return { inserted: 0, skipped: 0, errors: ['No se seleccionó archivo.'] }

  const text = await file.text()
  const rows = parseCSV(text)

  if (rows.length === 0) return { inserted: 0, skipped: 0, errors: ['El archivo está vacío o el formato es incorrecto.'] }

  const adminDb = createAdminClient()
  const errors: string[] = []
  let inserted = 0
  let skipped = 0

  const validTracks = ['nbdhe', 'jurisprudence']
  const validOptions = ['a', 'b', 'c', 'd']
  const validDifficulty = ['easy', 'medium', 'hard']

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNum = i + 2

    const track = row['track']?.toLowerCase()
    const correct = row['correct_option']?.toLowerCase()
    const difficulty = row['difficulty']?.toLowerCase() || 'medium'
    const weekNum = parseInt(row['week_number'] || '1')

    if (!row['question_text']) { errors.push(`Línea ${lineNum}: question_text es requerido`); skipped++; continue }
    if (!row['option_a'] || !row['option_b'] || !row['option_c'] || !row['option_d']) { errors.push(`Línea ${lineNum}: se requieren las 4 opciones`); skipped++; continue }
    if (!validTracks.includes(track)) { errors.push(`Línea ${lineNum}: track inválido "${row['track']}" (usar: nbdhe, jurisprudence)`); skipped++; continue }
    if (!validOptions.includes(correct)) { errors.push(`Línea ${lineNum}: correct_option inválido "${row['correct_option']}" (usar: a, b, c, d)`); skipped++; continue }
    if (!validDifficulty.includes(difficulty)) { errors.push(`Línea ${lineNum}: difficulty inválido (usar: easy, medium, hard)`); skipped++; continue }
    if (isNaN(weekNum) || weekNum < 1 || weekNum > 20) { errors.push(`Línea ${lineNum}: week_number debe ser 1-20`); skipped++; continue }

    const { error } = await adminDb.from('questions').insert({
      question_text: row['question_text'],
      option_a: row['option_a'],
      option_b: row['option_b'],
      option_c: row['option_c'],
      option_d: row['option_d'],
      correct_option: correct,
      explanation: row['explanation'] || null,
      difficulty,
      track,
      week_number: weekNum,
      chapter_tag: row['chapter_tag'] || null,
      is_active: true,
    })

    if (error) { errors.push(`Línea ${lineNum}: ${error.message}`); skipped++ }
    else inserted++
  }

  return { inserted, skipped, errors }
}

export async function importVocab(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    return { inserted: 0, skipped: 0, errors: ['No autorizado.'] }
  }

  const file = formData.get('file') as File | null
  if (!file) return { inserted: 0, skipped: 0, errors: ['No se seleccionó archivo.'] }

  const text = await file.text()
  const rows = parseCSV(text)

  if (rows.length === 0) return { inserted: 0, skipped: 0, errors: ['El archivo está vacío o el formato es incorrecto.'] }

  const adminDb = createAdminClient()
  const errors: string[] = []
  let inserted = 0
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNum = i + 2
    const weekNum = parseInt(row['week_number'] || '1')

    if (!row['spanish_term']) { errors.push(`Línea ${lineNum}: spanish_term es requerido`); skipped++; continue }
    if (!row['english_term']) { errors.push(`Línea ${lineNum}: english_term es requerido`); skipped++; continue }
    if (isNaN(weekNum) || weekNum < 1 || weekNum > 20) { errors.push(`Línea ${lineNum}: week_number debe ser 1-20`); skipped++; continue }

    const { error } = await adminDb.from('vocab_sets').insert({
      spanish_term: row['spanish_term'],
      english_term: row['english_term'],
      pronunciation_tip: row['pronunciation_tip'] || null,
      category: row['category'] || null,
      week_number: weekNum,
    })

    if (error) { errors.push(`Línea ${lineNum}: ${error.message}`); skipped++ }
    else inserted++
  }

  return { inserted, skipped, errors }
}
