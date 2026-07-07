#!/usr/bin/env tsx
/**
 * PDF Question Extractor
 * Reads question bank PDFs using the Claude API, extracts structured questions,
 * and imports them into Supabase.
 *
 * Usage:
 *   npx tsx scripts/extract-questions.ts
 *
 * Requirements:
 *   npm install @anthropic-ai/sdk pdf-parse @supabase/supabase-js dotenv tsx
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { execFileSync } from 'child_process'
import * as os from 'os'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Map PDF filename → week range and track
const PDF_CONFIG: Record<string, { weeks: number[]; track: 'nbdhe' | 'jurisprudence' }> = {
  // Already processed — comment out to skip re-import
  // 'Practice test 3.pdf': { weeks: [1,2,3,4,5,6,7,8,9,10,11,12], track: 'nbdhe' },

  'Book.pdf':       { weeks: [1,2,3,4,5,6,7,8,9,10], track: 'nbdhe' },
  'Chapter 2-5.pdf':{ weeks: [2,3,4,5], track: 'nbdhe' },
  'Chapter 6-9.pdf':{ weeks: [6,7,8,9], track: 'nbdhe' },
  'Chapter 10.pdf': { weeks: [10,11,12,13], track: 'nbdhe' },
}

const EXTRACTION_PROMPT = `You are extracting multiple-choice questions from a dental hygiene board exam prep document.

Extract ALL multiple-choice questions you can find. Questions may be numbered, labeled, or in any format.
Look for questions followed by 4 answer choices (often labeled A/B/C/D or 1/2/3/4).

Return a raw JSON array — no markdown, no code fences, no explanation — just the array:
[
  {
    "question_text": "Full question text here",
    "option_a": "First answer choice (without the A. label)",
    "option_b": "Second answer choice",
    "option_c": "Third answer choice",
    "option_d": "Fourth answer choice",
    "correct_option": "a",
    "explanation": "Why this answer is correct, or null if not provided",
    "difficulty": "medium"
  }
]

Rules:
- correct_option must be exactly one of: "a", "b", "c", "d"
- difficulty must be exactly one of: "easy", "medium", "hard" — default to "medium"
- Strip any letter/number prefix from answer choices (e.g. "A. Enamel" → "Enamel")
- If no questions found, return []
- Return ONLY the JSON array, nothing else`

interface ExtractedQuestion {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: 'a' | 'b' | 'c' | 'd'
  explanation: string | null
  difficulty: 'easy' | 'medium' | 'hard'
}

function parseExtractedJSON(text: string): ExtractedQuestion[] {
  let cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  if (!cleaned.startsWith('[')) {
    const start = cleaned.indexOf('[')
    if (start !== -1) cleaned = cleaned.slice(start)
  }
  if (!cleaned.endsWith(']')) {
    const lastBrace = cleaned.lastIndexOf('},')
    if (lastBrace !== -1) {
      cleaned = cleaned.slice(0, lastBrace + 1) + ']'
      console.log('  Warning: response truncated, recovered partial results')
    } else {
      return []
    }
  }
  return JSON.parse(cleaned) as ExtractedQuestion[]
}

async function askClaude(prompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}

async function extractQuestionsFromPDF(pdfPath: string): Promise<ExtractedQuestion[]> {
  const pdfBuffer = fs.readFileSync(pdfPath)
  const fileSizeMB = pdfBuffer.length / (1024 * 1024)

  // For small PDFs (<8MB) send as base64 document directly
  if (fileSizeMB < 8) {
    console.log(`  Sending as document (${fileSizeMB.toFixed(1)} MB)...`)
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBuffer.toString('base64') } },
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    try { return parseExtractedJSON(text) } catch { console.error('  Parse error:', text.slice(0, 200)); return [] }
  }

  // For large PDFs: try text extraction first, fall back to vision (OCR via Claude)
  console.log(`  Large file (${fileSizeMB.toFixed(1)} MB) — extracting text...`)
  const tmpTxt = path.join(os.tmpdir(), `viva_pdf_${Date.now()}.txt`)
  let fullText = ''
  try {
    execFileSync('/opt/homebrew/bin/pdftotext', [pdfPath, tmpTxt], { timeout: 60000 })
    fullText = fs.readFileSync(tmpTxt, 'utf-8')
    fs.unlinkSync(tmpTxt)
  } catch { /* ignore */ }

  const allQuestions: ExtractedQuestion[] = []

  if (fullText && fullText.trim().length >= 100) {
    // Text-based PDF: chunk and send as text
    const CHUNK_SIZE = 12000
    const OVERLAP = 500
    const chunks: string[] = []
    for (let i = 0; i < fullText.length; i += CHUNK_SIZE - OVERLAP) {
      chunks.push(fullText.slice(i, i + CHUNK_SIZE))
    }
    console.log(`  Text extracted — split into ${chunks.length} chunks`)
    for (let i = 0; i < chunks.length; i++) {
      console.log(`  Chunk ${i + 1}/${chunks.length}...`)
      const prompt = `${EXTRACTION_PROMPT}\n\nDocument text:\n${chunks[i]}`
      try {
        const text = await askClaude(prompt)
        allQuestions.push(...parseExtractedJSON(text))
        if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 1000))
      } catch (e) {
        console.error(`  Chunk ${i + 1} failed:`, (e as Error).message)
      }
    }
  } else {
    // Image-based (scanned) PDF: convert each page to PNG, send to Claude vision
    console.log('  No text found — using vision mode (scanned PDF)...')
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'viva_pages_'))
    try {
      execFileSync('/opt/homebrew/bin/pdftoppm', [
        '-png', '-r', '150', pdfPath, path.join(tmpDir, 'page')
      ], { timeout: 120000 })
    } catch (e) {
      console.error('  pdftoppm failed:', (e as Error).message)
      fs.rmSync(tmpDir, { recursive: true, force: true })
      return []
    }

    const pageFiles = fs.readdirSync(tmpDir)
      .filter(f => f.endsWith('.png'))
      .sort()
    console.log(`  Converted ${pageFiles.length} pages — sending to Claude vision...`)

    // Send pages 2 at a time to keep token cost reasonable
    const PAGE_BATCH = 2
    for (let i = 0; i < pageFiles.length; i += PAGE_BATCH) {
      const batch = pageFiles.slice(i, i + PAGE_BATCH)
      console.log(`  Pages ${i + 1}–${Math.min(i + PAGE_BATCH, pageFiles.length)}/${pageFiles.length}...`)
      const imageContent: Anthropic.ImageBlockParam[] = batch.map(f => ({
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: 'image/png' as const,
          data: fs.readFileSync(path.join(tmpDir, f)).toString('base64'),
        },
      }))
      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 16000,
          messages: [{
            role: 'user',
            content: [...imageContent, { type: 'text', text: EXTRACTION_PROMPT }],
          }],
        })
        const text = response.content[0].type === 'text' ? response.content[0].text : ''
        const questions = parseExtractedJSON(text)
        allQuestions.push(...questions)
        console.log(`    → found ${questions.length} questions`)
        if (i + PAGE_BATCH < pageFiles.length) await new Promise(r => setTimeout(r, 1500))
      } catch (e) {
        console.error(`  Pages ${i + 1}–${i + PAGE_BATCH} failed:`, (e as Error).message)
      }
    }

    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  // Deduplicate by question_text prefix
  const seen = new Set<string>()
  return allQuestions.filter(q => {
    const key = q.question_text.slice(0, 80)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function main() {
  const questionsDir = path.join(__dirname, '../../dental hygiene/questions')

  if (!fs.existsSync(questionsDir)) {
    console.error(`Questions directory not found: ${questionsDir}`)
    process.exit(1)
  }

  let totalInserted = 0

  for (const [filename, config] of Object.entries(PDF_CONFIG)) {
    const pdfPath = path.join(questionsDir, filename)

    if (!fs.existsSync(pdfPath)) {
      console.log(`Skipping ${filename} (not found)`)
      continue
    }

    console.log(`\nProcessing: ${filename}`)
    const questions = await extractQuestionsFromPDF(pdfPath)
    console.log(`  Extracted ${questions.length} questions`)

    if (questions.length === 0) continue

    // Filter out incomplete questions (missing required option fields)
    const valid = questions.filter(q =>
      q.question_text && q.option_a && q.option_b && q.option_c && q.option_d &&
      ['a','b','c','d'].includes(q.correct_option)
    )
    const skipped = questions.length - valid.length
    if (skipped > 0) console.log(`  Skipped ${skipped} incomplete questions`)

    // Assign week numbers (round-robin across the weeks in config)
    const rows = valid.map((q, i) => ({
      ...q,
      track: config.track,
      week_number: config.weeks[i % config.weeks.length],
      is_active: true,
    }))

    const { error } = await supabase
      .from('questions')
      .insert(rows)

    if (error) {
      console.error(`  Insert error: ${error.message}`)
    } else {
      console.log(`  Inserted ${rows.length} questions into Supabase`)
      totalInserted += rows.length
    }

    // Rate limit: 2 second pause between PDFs
    await new Promise(r => setTimeout(r, 2000))
  }

  console.log(`\nDone. Total questions imported: ${totalInserted}`)
  console.log('Review and correct questions in the Admin CMS at /admin/questions')
}

main().catch(console.error)
