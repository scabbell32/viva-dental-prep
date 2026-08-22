import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY

async function callGemini(prompt: string): Promise<string> {
  const models = ['gemini-flash-lite-latest', 'gemini-flash-latest']
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) return text
      }
    } catch (err) {
      console.warn(`Model ${model} attempt failed, trying next...`)
    }
  }
  throw new Error('All model endpoints failed')
}

async function main() {
  console.log('=== Step 1: Loading Parsed Chapter 12 Questions ===')
  const rawQs = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/ch12_parsed_raw.json'), 'utf-8'))
  console.log(`Loaded ${rawQs.length} questions.`)

  // Step 2: Translate to Spanish in batches of 10
  console.log('\n=== Step 2: Translating Questions to Spanish ===')
  const batchSize = 10
  const allTranslations: Record<number, any> = {}

  for (let i = 0; i < rawQs.length; i += batchSize) {
    const batch = rawQs.slice(i, i + batchSize)
    console.log(`Translating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(rawQs.length / batchSize)} (Q${i + 1} to Q${Math.min(i + batchSize, rawQs.length)})...`)

    const payload = batch.map((q: any, idx: number) => ({
      index: i + idx + 1,
      orig_num: q.orig_num,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      explanation: q.explanation,
    }))

    const prompt = `You are an expert dental board exam (NBDHE) translator. Translate the following array of nutrition and biochemistry questions into professional dental Spanish (used in Latin America and Spain). Preserve scientific, nutritional, and dental terminology accurately.

Return a valid JSON array matching this exact schema:
[
  {
    "index": 1,
    "question_text_es": "translated question in Spanish",
    "option_a_es": "translated option A in Spanish",
    "option_b_es": "translated option B in Spanish",
    "option_c_es": "translated option C in Spanish",
    "option_d_es": "translated option D in Spanish",
    "explanation_es": "detailed clinical explanation and rationale in Spanish"
  }
]

Payload:
${JSON.stringify(payload, null, 2)}`

    const jsonText = await callGemini(prompt)
    try {
      const parsed = JSON.parse(jsonText.trim())
      for (const item of parsed) {
        allTranslations[item.index] = item
      }
    } catch (err) {
      console.error('JSON parse error in translation batch:', err)
    }
  }

  console.log(`✅ Translated ${Object.keys(allTranslations).length} questions to Spanish.`)

  // Step 3: Delete old corrupted ch12 questions
  console.log('\n=== Step 3: Cleaning up old Chapter 12 legacy questions in Supabase ===')
  const { count: deletedCount, error: delErr } = await supabase
    .from('questions')
    .delete()
    .eq('chapter_tag', 'ch12')

  if (delErr) {
    console.error('Error deleting old ch12 questions:', delErr.message)
  } else {
    console.log('✅ Successfully removed old corrupted Chapter 12 questions.')
  }

  // Step 4: Insert new clean questions
  console.log('\n=== Step 4: Inserting Clean Bilingual Questions into Supabase ===')
  const rowsToInsert = rawQs.map((q: any, idx: number) => {
    const seq = idx + 1
    const tr = allTranslations[seq] || {}
    return {
      track: 'nbdhe',
      week_number: 7,
      chapter_tag: 'ch12',
      sequence_order: seq,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
      explanation: q.explanation,
      difficulty: 'medium',
      is_active: true,
      question_text_es: tr.question_text_es || null,
      option_a_es: tr.option_a_es || null,
      option_b_es: tr.option_b_es || null,
      option_c_es: tr.option_c_es || null,
      option_d_es: tr.option_d_es || null,
      explanation_es: tr.explanation_es || null,
    }
  })

  const { data: inserted, error: insErr } = await supabase
    .from('questions')
    .insert(rowsToInsert)
    .select('id, sequence_order, question_text')

  if (insErr) {
    console.error('Error inserting Chapter 12 questions:', insErr.message)
  } else {
    console.log(`✅ Successfully inserted ${inserted?.length} clean bilingual questions for Chapter 12 (Week 7)!`)
  }

  // Step 5: Translate Case Sets in Supabase if needed
  console.log('\n=== Step 5: Checking Chapter 12 Case Sets ===')
  const { data: caseSets } = await supabase
    .from('case_sets')
    .select('*')
    .eq('chapter_tag', 'ch12')

  console.log(`Chapter 12 Case Sets found: ${caseSets?.length}`)
  caseSets?.forEach(cs => {
    console.log(`- [${cs.chapter_tag}] ID: ${cs.id} | Label: ${cs.case_label} | Week: ${cs.week_number}`)
  })
}

main()
