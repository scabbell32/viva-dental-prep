export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { QuizBuilderClient } from '@/components/admin/quiz-builder-client'

export default async function QuizBuilderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.user_metadata?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()

  // Fetch all distinct chapters that have active questions
  const { data: rows } = await adminClient
    .from('questions')
    .select('chapter_tag')
    .eq('is_active', true)
    .not('chapter_tag', 'is', null)

  const chapters = [...new Set((rows ?? []).map(r => r.chapter_tag).filter(Boolean))]
    .sort((a, b) => {
      const n = (s: string) => parseInt(s.replace(/\D/g, '') || '0')
      return n(a!) - n(b!)
    }) as string[]

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role="admin" />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Generador de Quiz</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configura los parámetros y genera una vista previa del quiz
          </p>
        </div>
        <QuizBuilderClient chapters={chapters} />
      </main>
    </div>
  )
}
