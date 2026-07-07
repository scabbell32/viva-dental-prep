export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VocabForm } from '@/components/admin/vocab-form'
import { DeleteButton } from '@/components/admin/delete-button'

export default async function AdminVocabPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.user_metadata?.role !== 'admin') redirect('/dashboard')

  const { data: vocab } = await supabase
    .from('vocab_sets')
    .select('*')
    .order('week_number')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role="admin" />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Vocabulario Clínico</h1>
        <Card>
          <CardHeader><CardTitle className="text-base">Agregar Término</CardTitle></CardHeader>
          <CardContent><VocabForm /></CardContent>
        </Card>
        <div className="space-y-2">
          {(vocab ?? []).map(v => (
            <Card key={v.id}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Sem. {v.week_number}</Badge>
                      {v.category && <Badge variant="outline" className="text-xs">{v.category}</Badge>}
                    </div>
                    <p className="font-medium">{v.english_term} <span className="text-gray-400 font-normal">/ {v.spanish_term}</span></p>
                    {v.pronunciation_tip && <p className="text-xs text-teal-600 italic">{v.pronunciation_tip}</p>}
                  </div>
                  <DeleteButton table="vocab_sets" id={v.id} />
                </div>
              </CardContent>
            </Card>
          ))}
          {(!vocab || vocab.length === 0) && (
            <p className="text-gray-400 text-center py-8">No hay vocabulario todavía.</p>
          )}
        </div>
      </main>
    </div>
  )
}
