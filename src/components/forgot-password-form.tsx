'use client'

import { useActionState } from 'react'
import { forgotPasswordAction } from '@/app/login/forgot-password/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null)

  return (
    <Card className="shadow-lg border border-gray-100 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-center text-xl font-bold text-teal-800 dark:text-teal-400">
          ¿Olvidaste tu contraseña? / Forgot Password?
        </CardTitle>
      </CardHeader>
      <CardContent>
        {state?.success ? (
          <div className="space-y-4 text-center">
            <div className="text-emerald-600 dark:text-emerald-400 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-sm border border-emerald-200/50">
              <p className="font-semibold">¡Correo enviado con éxito!</p>
              <p className="mt-1 text-xs opacity-90">
                Revisa tu bandeja de entrada para seguir las instrucciones. / Please check your inbox for password reset instructions.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-block text-sm text-teal-600 hover:text-teal-500 hover:underline font-medium transition-colors"
            >
              ← Volver al inicio de sesión / Back to login
            </Link>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo Electrónico / Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="email@example.com"
                className="w-full focus-visible:ring-teal-600"
              />
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Te enviaremos un enlace seguro para restablecer tu contraseña. / We will send you a secure link to reset your password.
              </p>
            </div>
            
            {state?.error && (
              <p className="text-red-500 text-sm font-medium bg-red-50 dark:bg-red-950/20 border border-red-200/30 p-2.5 rounded-md text-center">
                {state.error}
              </p>
            )}
            
            <div className="space-y-3 pt-2">
              <Button 
                type="submit" 
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all shadow-md active:scale-[0.99]" 
                disabled={pending}
              >
                {pending ? 'Enviando...' : 'Enviar Enlace / Send Reset Link'}
              </Button>
              
              <div className="text-center">
                <Link
                  href="/login"
                  className="text-xs text-gray-500 hover:text-teal-600 transition-colors font-medium"
                >
                  ← Volver al inicio de sesión / Back to login
                </Link>
              </div>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
