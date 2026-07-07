export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { VocabDrills } from '@/components/vocab/vocab-drills'
import { getCurrentWeekNumber } from '@/lib/program-week'
import { ui } from '@/lib/i18n'

export default async function VocabPage() {
  const supabase = await createClient()
  const adminDb = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await adminDb.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'candidate') redirect('/admin')

  const weekNumber = getCurrentWeekNumber()

  const { data: vocab } = await supabase
    .from('vocab_sets')
    .select('*')
    .lte('week_number', weekNumber)
    .order('week_number', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role="candidate" />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{ui.vocab.title}</h1>
        <p className="text-gray-500 text-sm mb-6">Vocabulario hasta la Semana {weekNumber}</p>
        {!vocab || vocab.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No hay vocabulario disponible todavía.</p>
        ) : (
          <VocabDrills vocab={vocab} weekNumber={weekNumber} />
        )}
      </main>
    </div>
  )
}
