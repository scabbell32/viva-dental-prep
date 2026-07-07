export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { ListeningClient } from '@/components/listening/listening-client'
import { getCurrentWeekNumber } from '@/lib/program-week'
import { ui } from '@/lib/i18n'
import { Card, CardContent } from '@/components/ui/card'

export default async function ListeningPage() {
  const supabase = await createClient()
  const adminDb = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await adminDb.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'candidate') redirect('/admin')

  const weekNumber = getCurrentWeekNumber()

  const { data: exercises } = await supabase
    .from('listening_exercises')
    .select('*')
    .lte('week_number', weekNumber)
    .eq('is_active', true)
    .order('week_number', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role="candidate" />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{ui.listening.title}</h1>
        <p className="text-gray-500 text-sm mb-6">Ejercicios clínicos bilingüe — Semana {weekNumber}</p>
        {!exercises || exercises.length === 0 ? (
          <Card><CardContent className="pt-6 text-center text-gray-400">No hay ejercicios disponibles todavía.</CardContent></Card>
        ) : (
          <ListeningClient exercises={exercises} />
        )}
      </main>
    </div>
  )
}
