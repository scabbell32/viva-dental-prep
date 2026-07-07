export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExerciseForm } from '@/components/admin/exercise-form'
import { DeleteButton } from '@/components/admin/delete-button'

export default async function AdminExercisesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.user_metadata?.role !== 'admin') redirect('/dashboard')

  const { data: exercises } = await supabase
    .from('listening_exercises')
    .select('*')
    .order('week_number')

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role="admin" />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Ejercicios de Comprensión</h1>
        <Card>
          <CardHeader><CardTitle className="text-base">Agregar Ejercicio</CardTitle></CardHeader>
          <CardContent><ExerciseForm /></CardContent>
        </Card>
        <div className="space-y-3">
          {(exercises ?? []).map(ex => (
            <Card key={ex.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <Badge variant="secondary">Sem. {ex.week_number}</Badge>
                      {!ex.is_active && <Badge variant="outline" className="text-gray-400">Inactivo</Badge>}
                    </div>
                    <p className="font-medium">{ex.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{ex.dialogue_text}</p>
                  </div>
                  <DeleteButton table="listening_exercises" id={ex.id} />
                </div>
              </CardContent>
            </Card>
          ))}
          {(!exercises || exercises.length === 0) && (
            <p className="text-gray-400 text-center py-8">No hay ejercicios todavía.</p>
          )}
        </div>
      </main>
    </div>
  )
}
