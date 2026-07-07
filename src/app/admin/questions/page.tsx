export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuestionForm } from '@/components/admin/question-form'
import { QuestionsClient } from '@/components/admin/questions-client'

export default async function QuestionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.user_metadata?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()
  const { data: questions } = await adminClient
    .from('questions')
    .select('id, track, week_number, chapter_tag, question_text, option_a, option_b, option_c, option_d, option_e, option_f, correct_option, explanation, difficulty, is_active, image_url, image_urls, case_set_id, sequence_order, is_legacy, case_set:case_sets(id, case_label, images:case_images(image_url))')
    .order('week_number', { ascending: true })
    .order('created_at', { ascending: false })

  const parsedQuestions = (questions ?? []).map(q => {
    const rawCaseSet = (q as any).case_set
    const caseSet = Array.isArray(rawCaseSet) ? rawCaseSet[0] : rawCaseSet
    return {
      ...q,
      case_set: caseSet || null
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role="admin" />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Banco de Preguntas</h1>

        <Card>
          <CardHeader><CardTitle className="text-base">Agregar Nueva Pregunta</CardTitle></CardHeader>
          <CardContent><QuestionForm /></CardContent>
        </Card>

        <QuestionsClient questions={parsedQuestions} />
      </main>
    </div>
  )
}
