import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function askClaudeJSON(prompt: string): Promise<any> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  })
  
  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  
  // Extract JSON array or object
  let cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
  if (!cleaned.startsWith('[') && !cleaned.startsWith('{')) {
    const startIdx = cleaned.search(/[\[\{]/)
    if (startIdx !== -1) cleaned = cleaned.slice(startIdx)
  }
  
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    console.error('Failed to parse Claude JSON response:', (e as Error).message)
    console.log('Raw text excerpt:', text.slice(0, 300))
    throw e;
  }
}

async function translateCaseStudies() {
  console.log('Fetching untranslated case studies...')
  const { data: cases, error } = await supabase
    .from('case_studies')
    .select('id, title, synopsis')
    .or('title_es.is.null,synopsis_es.is.null')

  if (error) {
    console.error('Error fetching case studies:', error.message)
    return
  }

  if (!cases || cases.length === 0) {
    console.log('All case studies are already translated!')
    return
  }

  console.log(`Found ${cases.length} untranslated case studies. Translating...`)

  for (let i = 0; i < cases.length; i++) {
    const cs = cases[i]
    console.log(`Translating case ${i + 1}/${cases.length}: "${cs.title}"...`)

    const prompt = `You are translating a dental hygiene board exam patient case study from English to professional medical Spanish.
Translate both the title and the clinical synopsis. Preserve all bullet points, numbers, symbols, and medical terms accurately.

Return a raw JSON object with keys "title_es" and "synopsis_es" (and no markdown, no code fences):
{
  "title_es": "Spanish title",
  "synopsis_es": "Spanish synopsis"
}

Original Case:
Title: ${cs.title}
Synopsis:
${cs.synopsis}`

    try {
      const translated = await askClaudeJSON(prompt)
      const { error: updateErr } = await supabase
        .from('case_studies')
        .update({
          title_es: translated.title_es,
          synopsis_es: translated.synopsis_es
        })
        .eq('id', cs.id)

      if (updateErr) {
        console.error(`  Failed to update case study "${cs.title}":`, updateErr.message)
      } else {
        console.log(`  Successfully translated case study!`)
      }
      
      // Pause to avoid rate limits
      await new Promise(r => setTimeout(r, 2000))
    } catch (e) {
      console.error(`  Failed to translate case "${cs.title}":`, (e as Error).message)
    }
  }
}

async function translateQuestions() {
  console.log('\nFetching ALL untranslated questions...')
  const { data: qs, error } = await supabase
    .from('questions')
    .select('id, question_text, option_a, option_b, option_c, option_d, explanation')
    .is('question_text_es', null)
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching questions:', error.message)
    return
  }

  if (!qs || qs.length === 0) {
    console.log('All questions in this batch (or database) are already translated!')
    return
  }

  const BATCH_SIZE = 5
  console.log(`Found ${qs.length} untranslated questions. Translating in batches of ${BATCH_SIZE}...`)

  for (let i = 0; i < qs.length; i += BATCH_SIZE) {
    const batch = qs.slice(i, i + BATCH_SIZE)
    console.log(`Translating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(qs.length / BATCH_SIZE)} (questions ${i + 1}–${Math.min(i + BATCH_SIZE, qs.length)})...`)

    const prompt = `You are translating a batch of dental hygiene board exam multiple-choice questions from English to professional medical Spanish for native speakers.
Translate:
1. question_text -> question_text_es
2. option_a -> option_a_es
3. option_b -> option_b_es
4. option_c -> option_c_es
5. option_d -> option_d_es
6. explanation -> explanation_es

Keep the correct answers and option letters exactly the same. Use standard medical Spanish terms.

Return a raw JSON array of objects (no markdown, no code fences):
[
  {
    "id": "question-uuid",
    "question_text_es": "translated statement",
    "option_a_es": "translated A",
    "option_b_es": "translated B",
    "option_c_es": "translated C",
    "option_d_es": "translated D",
    "explanation_es": "translated explanation or null"
  }
]

Questions to translate:
${JSON.stringify(batch, null, 2)}`

    try {
      const results = await askClaudeJSON(prompt)
      
      if (!Array.isArray(results)) {
        console.error('  Error: Expected a JSON array from Claude but got something else.')
        continue
      }

      console.log(`  Updating ${results.length} questions in Supabase...`)
      for (const res of results) {
        const { error: updateErr } = await supabase
          .from('questions')
          .update({
            question_text_es: res.question_text_es,
            option_a_es: res.option_a_es,
            option_b_es: res.option_b_es,
            option_c_es: res.option_c_es,
            option_d_es: res.option_d_es,
            explanation_es: res.explanation_es
          })
          .eq('id', res.id)

        if (updateErr) {
          console.error(`    Failed to update question ID ${res.id}:`, updateErr.message)
        }
      }
      console.log('  Batch update successful!')

      // Pause to respect rate limits
      await new Promise(r => setTimeout(r, 2000))
    } catch (e) {
      console.error('  Failed to translate batch:', (e as Error).message)
    }
  }
}

async function main() {
  console.log('=== Starting Auto-Translation Pipeline ===')
  
  // 1. Translate case studies
  await translateCaseStudies()
  
  // 2. Translate questions
  await translateQuestions()
  
  console.log('\n=== Auto-Translation Pipeline Complete ===')
}

main().catch(console.error)
