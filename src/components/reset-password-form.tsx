'use client'

import { useActionState } from 'react'
import { resetPasswordAction } from '@/app/login/reset-password/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, null)

  return (
    <Card className="shadow-lg border border-gray-100 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-center text-xl font-bold text-teal-800 dark:text-teal-400">
          Nueva Contraseña / Reset Password
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Nueva Contraseña / New Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full focus-visible:ring-teal-600"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmar Contraseña / Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full focus-visible:ring-teal-600"
            />
          </div>

          {state?.error && (
            <p className="text-red-500 text-sm font-medium bg-red-50 dark:bg-red-950/20 border border-red-200/30 p-2.5 rounded-md text-center">
              {state.error}
            </p>
          )}

          <Button 
            type="submit" 
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all shadow-md active:scale-[0.99] mt-2" 
            disabled={pending}
          >
            {pending ? 'Actualizando...' : 'Actualizar Contraseña / Update Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
