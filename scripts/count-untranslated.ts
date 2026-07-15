import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('id, question_text, question_text_es, is_active, week_number')

  if (qErr) {
    console.error('Error fetching questions:', qErr.message)
    return
  }

  const { data: dailyQuizzes, error: dqErr } = await supabase
    .from('daily_quizzes')
    .select('id, date, status, question_ids')
    .order('date', { ascending: false })
    .limit(10)

  if (dqErr) {
    console.error('Error fetching daily quizzes:', dqErr.message)
    return
  }

  const active = questions.filter(q => q.is_active)
  const untranslated = active.filter(q => !q.question_text_es)

  console.log(`Total questions: ${questions.length}`)
  console.log(`Active questions: ${active.length}`)
  console.log(`Untranslated active questions: ${untranslated.length}`)
  
  const untranslatedByWeek: Record<number, number> = {}
  for (const q of untranslated) {
    const w = q.week_number ?? 0
    untranslatedByWeek[w] = (untranslatedByWeek[w] ?? 0) + 1
  }
  console.log('Untranslated active questions by week:', untranslatedByWeek)

  console.log('\n--- Recent Daily Quizzes ---')
  const qMap = new Map(questions.map(q => [q.id, q]))
  for (const dq of (dailyQuizzes ?? [])) {
    const ids = dq.question_ids || []
    const untranslatedCount = ids.filter((id: string) => {
      const q = qMap.get(id)
      return q && !q.question_text_es
    }).length
    console.log(`Date: ${dq.date} | Status: ${dq.status} | Total Qs: ${ids.length} | Untranslated Qs: ${untranslatedCount}`)
  }
}

main().catch(console.error)
