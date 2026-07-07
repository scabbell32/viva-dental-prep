export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { ImportForms } from './import-form'

export default async function ImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.user_metadata?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role="admin" />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-2">
        <h1 className="text-2xl font-bold text-gray-800">Importar Contenido</h1>
        <p className="text-gray-500 text-sm mb-6">
          Importa preguntas y vocabulario desde archivos CSV. Descarga la plantilla, llénala, y súbela aquí.
        </p>
        <ImportForms />
      </main>
    </div>
  )
}
