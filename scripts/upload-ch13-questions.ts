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
  console.log('=== Step 1: Loading Chapter 13 Questions ===')
  const rawQs = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/ch13_parsed_raw.json'), 'utf-8'))
  console.log(`Loaded ${rawQs.length} questions for Chapter 13.`)

  // Step 2: Translate in batches of 10
  console.log('\n=== Step 2: Translating 100 Biomaterials Questions to Spanish ===')
  const batchSize = 10
  const allTranslations: Record<number, any> = {}

  for (let i = 0; i < rawQs.length; i += batchSize) {
    const batch = rawQs.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(rawQs.length / batchSize)
    console.log(`Translating batch ${batchNum}/${totalBatches} (Q${i + 1} to Q${Math.min(i + batchSize, rawQs.length)})...`)

    const payload = batch.map((q: any, idx: number) => ({
      index: i + idx + 1,
      orig_num: q.orig_num,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      option_e: q.option_e || '',
      explanation: q.explanation,
    }))

    const prompt = `You are an expert dental materials and biomaterials board exam (NBDHE) translator. Translate the following array of dental materials and biomaterials questions into professional dental Spanish (used in Latin America and Spain). Preserve dental, clinical, metallurgical, and chemical terms accurately (e.g., amalgama, ionómero de vidrio, resina compuesta, grabado ácido con ácido fosfórico, capa híbrida, módulo elástico, tiempo de fraguado, polimerización).

Return a valid JSON array matching this exact schema:
[
  {
    "index": 1,
    "question_text_es": "translated question in Spanish",
    "option_a_es": "translated option A in Spanish",
    "option_b_es": "translated option B in Spanish",
    "option_c_es": "translated option C in Spanish",
    "option_d_es": "translated option D in Spanish",
    "option_e_es": "translated option E in Spanish (if present)",
    "explanation_es": "detailed clinical explanation and rationale in Spanish"
  }
]

Payload:
${JSON.stringify(payload, null, 2)}`

    try {
      const jsonText = await callGemini(prompt)
      const parsed = JSON.parse(jsonText.trim())
      for (const item of parsed) {
        allTranslations[item.index] = item
      }
    } catch (err) {
      console.error(`JSON parse error in batch ${batchNum}:`, err)
    }
  }

  console.log(`✅ Translated ${Object.keys(allTranslations).length} questions to Spanish.`)

  // Step 3: Delete old corrupted Chapter 13 questions
  console.log('\n=== Step 3: Cleaning up old Chapter 13 questions in Supabase ===')
  const { error: delErr } = await supabase
    .from('questions')
    .delete()
    .eq('chapter_tag', 'ch13')

  if (delErr) {
    console.error('Error deleting old ch13 questions:', delErr.message)
  } else {
    console.log('✅ Successfully removed old corrupted Chapter 13 questions.')
  }

  // Step 4: Insert clean questions in chunks of 25
  console.log('\n=== Step 4: Inserting 100 Clean Bilingual Questions into Supabase ===')
  const rowsToInsert = rawQs.map((q: any, idx: number) => {
    const seq = idx + 1
    const tr = allTranslations[seq] || {}
    return {
      track: 'nbdhe',
      week_number: 7,
      chapter_tag: 'ch13',
      sequence_order: seq,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      option_e: q.option_e || null,
      correct_option: q.correct_option,
      explanation: q.explanation,
      difficulty: 'medium',
      is_active: true,
      question_text_es: tr.question_text_es || null,
      option_a_es: tr.option_a_es || null,
      option_b_es: tr.option_b_es || null,
      option_c_es: tr.option_c_es || null,
      option_d_es: tr.option_d_es || null,
      option_e_es: tr.option_e_es || null,
      explanation_es: tr.explanation_es || null,
    }
  })

  const chunkSize = 25
  let totalInserted = 0
  for (let c = 0; c < rowsToInsert.length; c += chunkSize) {
    const chunk = rowsToInsert.slice(c, c + chunkSize)
    const { data: ins, error: insErr } = await supabase
      .from('questions')
      .insert(chunk)
      .select('id')

    if (insErr) {
      console.error(`Error inserting chunk ${c / chunkSize + 1}:`, insErr.message)
    } else {
      totalInserted += ins?.length || 0
    }
  }

  console.log(`✅ Successfully inserted ${totalInserted} clean bilingual questions for Chapter 13 (Week 7)!`)
}

main()
