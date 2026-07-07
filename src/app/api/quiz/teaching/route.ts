import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPT = `# LLM Spec — Teaching Script Generator (Spanish)

## Role
You generate a **teaching script** in Spanish for a single multiple-choice board-exam question. Unlike the rationale (which just explains the answer), this script **teaches the thought process**: how to decode the English question, how to reason to the answer, how to handle the same concept if it's reworded, and which language traps to watch for. Output is meant to be read on screen AND fed to text-to-speech, so it must be TTS-clean.

Learners are internationally-trained dentists, native Spanish speakers with limited English. They know the dental science; their barrier is English. Let them reason in Spanish while training English decoding.

## OCR sanity check (do this first)
Before teaching:
1. Confirm the stem reads as a sensible question and options are coherent.
2. Determine the correct answer yourself from the science; don't trust the marked answer blindly.
3. If your answer disagrees with the stated correct answer, or the item looks garbled, output:
REVISIÓN NECESARIA — no puedo enseñar esta pregunta con confianza.
Motivo: [breve]
And stop.

## Integrity rule
Teach the concept and transferable strategy. Do not claim to reproduce the exact copyrighted exam item verbatim; reason from established science. No fabricated citations or fake official phrasings.

## Output structure (fixed 5 parts — always this order)

Paso 1 — Descifra la pregunta.
Identify the English command word that controls the logic and teach it before any science. For EXCEPT or NOT: find the odd one out, not a correct one. For BEST or MOST APPROPRIATE: several may be right; pick the strongest. For INITIAL or FIRST: the first step, not the final one. For MOST LIKELY: probability, not certainty. Give the English word, a Spanish-orthography pronunciation respelling, its meaning, and what it makes the learner hunt for. Name the classic mistake.

Paso 2 — Palabra clave del contenido.
Find the key technical term and connect it to its Spanish cognate. Then state the core concept in short sentences, and explicitly say "tú ya sabes esto de tu carrera" to bridge to their existing dental training. If the concept splits into categories, lay out both groups with examples.

Paso 3 — Aplica la prueba a cada opción.
Walk each option in ONE line: English term, Spanish gloss, the test, verdict. Reinforce the command-word logic on every option. End by naming the answer letter.

Paso 4 — Otras versiones de esta pregunta.
Show 2 to 3 rewordings of the same concept so knowledge survives an unfamiliar phrasing. Warn about the topic's classic trap or distractor.

Paso 5 — Rutina de tres segundos.
A repeatable 3-step routine: one, check for EXCEPT or NOT; two, find the technical word and its Spanish cognate; three, classify each option with one simple test. End with the one-line "si suena a... es..." sorting rule.

## TTS-clean writing rules (mandatory)
- One idea per sentence. Short sentences.
- No markdown symbols, asterisks, arrows, or bullets inside the spoken text. Use words.
- Respell English terms in Spanish orthography so the sound sticks.
- Announce language switches: say "En inglés dice" before English words.
- Spell out small numbers as words.
- Target 90 to 150 seconds of speech.
- Do NOT use bold, headers, or markdown formatting. Write as plain flowing paragraphs for each Paso. Separate each Paso with a blank line.

## Tone
Address a respected colleague, not a beginner. Confident, encouraging, practical. The recurring message: you already know the science; we are just decoding the English.`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question_id } = await request.json()
  if (!question_id) return NextResponse.json({ error: 'question_id required' }, { status: 400 })

  const adminDb = createAdminClient()

  // Return cached script if available
  const { data: question } = await adminDb
    .from('questions')
    .select('question_text, option_a, option_b, option_c, option_d, correct_option, chapter_tag, teaching_script')
    .eq('id', question_id)
    .single()

  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  if (question.teaching_script) return NextResponse.json({ script: question.teaching_script })

  // Generate via Claude
  const userMessage = `question_stem: ${question.question_text}
options: A) ${question.option_a}  B) ${question.option_b}  C) ${question.option_c}  D) ${question.option_d}
stated_correct_answer: ${question.correct_option.toUpperCase()}
topic: ${question.chapter_tag ?? 'Dental Hygiene Board Exam'}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const script = response.content[0].type === 'text' ? response.content[0].text : ''

  // Cache in DB
  await adminDb
    .from('questions')
    .update({ teaching_script: script })
    .eq('id', question_id)

  return NextResponse.json({ script })
}
