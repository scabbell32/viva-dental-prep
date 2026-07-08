'use client'

import { useActionState } from 'react'
import { createCandidate } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import Link from 'next/link'

export function NewCandidateForm() {
  const [error, action, pending] = useActionState(createCandidate, null)

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={action} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input id="full_name" name="full_name" required placeholder="María García" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" name="email" type="email" required placeholder="maria@example.com" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Contraseña temporal</Label>
            <Input id="password" name="password" type="text" required placeholder="Viva2026!" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="country">País de origen</Label>
            <Input id="country" name="country" placeholder="México" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Número de WhatsApp (con + y código de país)</Label>
            <Input id="phone" name="phone" type="tel" placeholder="+5215512345678" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="english_level">Nivel de inglés</Label>
            <select
              id="english_level"
              name="english_level"
              className="w-full h-8 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="">Sin especificar</option>
              <option value="beginner">Principiante / Beginner</option>
              <option value="intermediate">Intermedio / Intermediate</option>
              <option value="advanced">Avanzado / Advanced</option>
            </select>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 flex-1" disabled={pending}>
              {pending ? 'Creando...' : 'Crear Candidato'}
            </Button>
            <Link href="/admin">
              <Button type="button" variant="outline">Cancelar</Button>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
