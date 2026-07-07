import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Simulate exactly what quiz/page.tsx does
async function simulateQuizPage(userId: string) {
  const weekNumber = 1 // getCurrentWeekNumber() returns 1

  // Check today's attempts
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { data: todayAttempts } = await db
    .from('quiz_attempts').select('track').eq('candidate_id', userId).gte('completed_at', today.toISOString())
  const completedTracks = new Set(todayAttempts?.map((a: any) => a.track) ?? [])
  console.log('completedTracks:', [...completedTracks])

  // fetchQuestions
  const { data, error } = await db
    .from('questions').select('*').eq('track', 'nbdhe').eq('is_active', true).lte('week_number', weekNumber).order('week_number', { ascending: false }).limit(50)
  console.log('fetchQuestions error:', error)
  console.log('fetchQuestions returned:', data?.length, 'rows')

  const shuffled = (data ?? []).sort(() => Math.random() - 0.5).slice(0, 15)
  console.log('shuffled to:', shuffled.length, 'questions')
  console.log('dailyDone:', completedTracks.has('nbdhe'))
  console.log('noQuestions:', shuffled.length === 0)
  console.log('WOULD RENDER: QuizClient?', !completedTracks.has('nbdhe') && shuffled.length > 0)
}

async function main() {
  const { data: profiles } = await db.from('profiles').select('id, full_name, role').eq('role', 'candidate')
  for (const p of profiles ?? []) {
    console.log('\n--- Candidate:', p.full_name, '---')
    await simulateQuizPage(p.id)
  }
}
main().catch(console.error)
