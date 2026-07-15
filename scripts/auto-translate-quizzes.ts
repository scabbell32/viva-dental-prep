import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

async function callGemini(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GOOGLE_API_KEY}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Gemini returned an empty response')
  }
  return text
}

async function callGeminiWithRetry(prompt: string, retries = 4, delay = 1500): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await callGemini(prompt)
    } catch (e) {
      if (attempt === retries) throw e
      console.warn(`⚠️ Attempt ${attempt} failed: ${(e as Error).message}. Retrying in ${delay}ms...`)
      await new Promise(r => setTimeout(r, delay))
      delay *= 2
    }
  }
  throw new Error('All translation retries failed')
}

async function translateQuestion(q: any) {
  console.log(`Translating question ID ${q.id} (Week ${q.week_number})...`)
  
  const payload = {
    question_text: q.question_text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    option_e: q.option_e,
    option_f: q.option_f,
    explanation: q.explanation,
  }

  const prompt = `You are an expert translator specializing in dental hygiene board exams (NBDHE). Translate the following question, choices, and explanation into professional dental Spanish (used in Latin America and Spain). Preserve clinical meanings and technical terms accurately.

Return a JSON object matching this schema:
{
  "question_text_es": "translated question",
  "option_a_es": "translated option A",
  "option_b_es": "translated option B",
  "option_c_es": "translated option C, or null if option_c is empty",
  "option_d_es": "translated option D, or null if option_d is empty",
  "option_e_es": "translated option E, or null if option_e is empty",
  "option_f_es": "translated option F, or null if option_f is empty",
  "explanation_es": "translated explanation/rationale, or null if empty"
}

Here is the English question JSON data to translate:
${JSON.stringify(payload, null, 2)}`

  const jsonText = await callGeminiWithRetry(prompt)
  const translated = JSON.parse(jsonText.trim())

  const { error } = await supabase
    .from('questions')
    .update({
      question_text_es: translated.question_text_es,
      option_a_es: translated.option_a_es,
      option_b_es: translated.option_b_es,
      option_c_es: translated.option_c_es || null,
      option_d_es: translated.option_d_es || null,
      option_e_es: translated.option_e_es || null,
      option_f_es: translated.option_f_es || null,
      explanation_es: translated.explanation_es || null,
    })
    .eq('id', q.id)

  if (error) {
    throw new Error(`Supabase update error: ${error.message}`)
  }
  console.log(`✅ Question ID ${q.id} translated successfully.`)
}

async function main() {
  console.log('Retrieving scheduled daily quizzes from July 14 onwards...')
  
  const { data: dailyQuizzes, error: dqErr } = await supabase
    .from('daily_quizzes')
    .select('id, date, question_ids')
    .gte('date', '2026-07-14')

  if (dqErr) throw dqErr

  const scheduledIds = new Set<string>()
  for (const dq of (dailyQuizzes ?? [])) {
    for (const id of (dq.question_ids ?? [])) {
      scheduledIds.add(id)
    }
  }

  const idsArray = Array.from(scheduledIds)
  console.log(`Found ${idsArray.length} unique questions scheduled in recent/upcoming daily quizzes.`)

  if (idsArray.length === 0) {
    console.log('No scheduled questions found to translate.')
    return
  }

  // Fetch these questions
  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('id, question_text, option_a, option_b, option_c, option_d, option_e, option_f, explanation, question_text_es, week_number')
    .in('id', idsArray)

  if (qErr) throw qErr

  const untranslated = (questions ?? []).filter(q => !q.question_text_es)
  console.log(`Found ${untranslated.length} untranslated questions among the scheduled ones.`)

  let count = 0
  for (const q of untranslated) {
    try {
      count++
      await translateQuestion(q)
      console.log(`Progress: ${count}/${untranslated.length}`)
      // Wait 13 seconds between queries to prevent exceeding the 5 requests-per-minute free tier quota
      if (count < untranslated.length) {
        console.log('Waiting 13 seconds to respect Gemini Free Tier rate limits...')
        await new Promise(r => setTimeout(r, 13000))
      }
    } catch (e) {
      console.error(`❌ Failed to translate question ${q.id}:`, (e as Error).message)
    }
  }

  console.log('Daily quizzes translation run completed successfully!')
}

main().catch(console.error)
