export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Nav } from '@/components/nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CaseSetAssign } from '@/components/admin/case-set-assign'

export default async function CaseSetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.user_metadata?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()

  const { data: caseSet } = await adminClient
    .from('case_sets')
    .select('*, images:case_images(id, image_url, caption, display_order)')
    .eq('id', id)
    .single()

  if (!caseSet) notFound()

  // All questions from the same chapter (for assignment UI)
  const { data: chapterQuestions } = await adminClient
    .from('questions')
    .select('id, question_text, option_a, option_b, correct_option, difficulty, case_set_id, question_type, sequence_order, is_active')
    .eq('chapter_tag', caseSet.chapter_tag)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role="admin" />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/admin/case-sets" className="text-sm text-gray-400 hover:text-gray-600">
            ← Case Sets
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-800">
            {caseSet.case_label}
            <span className="ml-2 text-sm font-normal text-gray-400">
              {caseSet.chapter_tag.toUpperCase()} · {caseSet.case_type}
            </span>
          </h1>
        </div>

        {/* Case set info */}
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-500">Case Context</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {caseSet.case_type === 'patient' && caseSet.patient_data && (
              <div className="rounded-md border overflow-hidden text-sm">
                <table className="w-full">
                  <tbody>
                    {Object.entries(caseSet.patient_data as Record<string, string>).map(([k, v]) => (
                      <tr key={k} className="border-b last:border-0">
                        <td className="px-3 py-1.5 font-medium text-gray-600 bg-gray-50 w-40 capitalize">
                          {k.replace(/_/g, ' ')}
                        </td>
                        <td className="px-3 py-1.5 text-gray-800">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {caseSet.description && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Scenario</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{caseSet.description}</p>
              </div>
            )}
            {caseSet.case_type === 'figure' && (!caseSet.images || caseSet.images.length === 0) && (
              <p className="text-sm text-amber-600">
                ⚠ No images uploaded yet. Images can be added via Supabase Storage once figures are extracted from the PDFs.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Question assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">
              Assign Questions from {caseSet.chapter_tag.toUpperCase()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CaseSetAssign
              caseSetId={id}
              chapterQuestions={chapterQuestions ?? []}
            />
          </CardContent>
        </Card>

      </main>
    </div>
  )
}
