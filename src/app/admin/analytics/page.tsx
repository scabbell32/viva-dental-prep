import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const adminDb = createAdminClient()

  const [{ data: missSummary }, { data: candidateMisses }] = await Promise.all([
    adminDb.from('question_miss_summary').select('*').limit(20),
    adminDb.from('candidate_missed_questions').select('*').limit(50),
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role="admin" />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        <h1 className="text-2xl font-bold text-gray-800">Análisis de Preguntas</h1>

        {/* Top missed questions */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Preguntas con más errores</h2>
          {!missSummary?.length ? (
            <p className="text-gray-400 text-sm">Aún no hay datos de intentos.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Pregunta</th>
                    <th className="px-4 py-3 text-left">Tema</th>
                    <th className="px-4 py-3 text-center">Intentos</th>
                    <th className="px-4 py-3 text-center">Errores</th>
                    <th className="px-4 py-3 text-center">% Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {missSummary.map((row: any) => (
                    <tr key={row.question_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 max-w-xs text-gray-800 leading-tight">{row.question_text}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.chapter_tag} · W{row.week_number}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{row.attempt_count}</td>
                      <td className="px-4 py-3 text-center font-semibold text-red-600">{row.miss_count}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${Number(row.miss_pct) >= 70 ? 'bg-red-100 text-red-700' : Number(row.miss_pct) >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {row.miss_pct ?? 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Per-candidate misses */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Errores por candidato</h2>
          {!candidateMisses?.length ? (
            <p className="text-gray-400 text-sm">Aún no hay datos de intentos.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Candidato</th>
                    <th className="px-4 py-3 text-left">Pregunta</th>
                    <th className="px-4 py-3 text-left">Tema</th>
                    <th className="px-4 py-3 text-center">Veces fallada</th>
                    <th className="px-4 py-3 text-left">Último error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {candidateMisses.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{row.full_name}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs leading-tight">{row.question_text}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.chapter_tag} · W{row.week_number}</td>
                      <td className="px-4 py-3 text-center font-semibold text-red-600">{row.times_missed}</td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                        {row.last_missed_at ? new Date(row.last_missed_at).toLocaleDateString('es-ES') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>
    </div>
  )
}
