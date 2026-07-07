export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Nav } from '@/components/nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CaseSetForm } from '@/components/admin/case-set-form'

export default async function CaseSetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.user_metadata?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()

  const { data: caseSets } = await adminClient
    .from('case_sets')
    .select('id, chapter_tag, case_label, case_type, is_active, description, created_at')
    .order('chapter_tag')
    .order('case_label')

  // Count questions per case set
  const { data: qCounts } = await adminClient
    .from('questions')
    .select('case_set_id')
    .not('case_set_id', 'is', null)
    .eq('is_active', true)

  const countMap: Record<string, number> = {}
  for (const q of qCounts ?? []) {
    if (q.case_set_id) countMap[q.case_set_id] = (countMap[q.case_set_id] ?? 0) + 1
  }

  // Group by chapter
  const byChapter: Record<string, typeof caseSets> = {}
  for (const cs of caseSets ?? []) {
    if (!byChapter[cs.chapter_tag]) byChapter[cs.chapter_tag] = []
    byChapter[cs.chapter_tag]!.push(cs)
  }

  const TYPE_COLORS: Record<string, string> = {
    patient: 'bg-purple-100 text-purple-700',
    figure:  'bg-blue-100 text-blue-700',
    text:    'bg-amber-100 text-amber-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role="admin" />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Case Sets</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Groups of questions that share a case context (patient chart, figure, or passage)
            </p>
          </div>
        </div>

        {/* Create form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crear Nuevo Case Set</CardTitle>
          </CardHeader>
          <CardContent>
            <CaseSetForm />
          </CardContent>
        </Card>

        {/* List by chapter */}
        {Object.keys(byChapter).length === 0 ? (
          <p className="text-gray-400 text-center py-12">No hay case sets todavía.</p>
        ) : (
          Object.entries(byChapter)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([chapter, sets]) => (
              <div key={chapter}>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                  {chapter.toUpperCase()}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(sets ?? []).map(cs => (
                    <Link key={cs.id} href={`/admin/case-sets/${cs.id}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-gray-800">{cs.case_label}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[cs.case_type] ?? ''}`}>
                                {cs.case_type}
                              </span>
                              {!cs.is_active && (
                                <Badge variant="outline" className="text-xs text-gray-400">inactivo</Badge>
                              )}
                            </div>
                          </div>
                          {cs.description && (
                            <p className="text-xs text-gray-500 line-clamp-2">{cs.description}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            {countMap[cs.id] ?? 0} pregunta{(countMap[cs.id] ?? 0) !== 1 ? 's' : ''} asignada{(countMap[cs.id] ?? 0) !== 1 ? 's' : ''}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))
        )}
      </main>
    </div>
  )
}
