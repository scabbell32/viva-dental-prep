import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../.env.local') })

import { createAdminClient } from '../src/lib/supabase/admin'

async function main() {
  const adminDb = createAdminClient()

  // Check question_results table exists
  const { data: qr, error: qrErr } = await adminDb
    .from('question_results')
    .select('*')
    .limit(1)

  if (qrErr) console.log('question_results ERROR:', qrErr.message)
  else console.log('question_results OK, keys:', qr && qr[0] ? Object.keys(qr[0]) : '(empty)')

  // Fetch 3 real question IDs to simulate a submit
  const { data: questions, error: qErr } = await adminDb
    .from('questions')
    .select('id, track, correct_option, explanation, explanation_es, chapter_tag')
    .eq('track', 'nbdhe')
    .eq('is_active', true)
    .limit(3)

  if (qErr || !questions?.length) {
    console.log('Could not fetch questions:', qErr?.message)
    return
  }

  console.log(`\nFetched ${questions.length} questions`)

  const userId = '64fbac67-0305-4c8b-8e6a-9ed695e64ad0'
  const answers = questions.map(q => ({
    question_id: q.id,
    selected_option: q.correct_option,
    is_correct: true,
    used_translation: false,
    chapter_tag: q.chapter_tag,
    correct_option: q.correct_option,
    explanation: q.explanation,
    explanation_es: q.explanation_es,
  }))

  const score = answers.length
  const { data: attempt, error: insertErr } = await adminDb
    .from('quiz_attempts')
    .insert({
      candidate_id: userId,
      track: 'nbdhe',
      week_number: 1,
      score,
      total_questions: answers.length,
      translation_reveals: 0,
      mode: 'weekly',
      answers: answers.map(({ question_id, selected_option, is_correct, used_translation }) => ({
        question_id, selected_option, is_correct, used_translation,
      })),
    })
    .select()
    .single()

  if (insertErr) {
    console.log('quiz_attempts INSERT ERROR:', insertErr.message, insertErr.details, insertErr.hint)
    return
  }

  console.log('quiz_attempts INSERT OK, attempt id:', attempt.id)

  // Test question_results insert
  const { error: qrInsertErr } = await adminDb.from('question_results').insert(
    answers.map(a => ({
      attempt_id: attempt.id,
      candidate_id: userId,
      question_id: a.question_id,
      selected_option: a.selected_option,
      correct_option: a.correct_option,
      is_correct: a.is_correct,
    }))
  )

  if (qrInsertErr) console.log('question_results INSERT ERROR:', qrInsertErr.message)
  else console.log('question_results INSERT OK')

  // Clean up
  await adminDb.from('quiz_attempts').delete().eq('id', attempt.id)
  console.log('Cleaned up test attempt')
}

main()
