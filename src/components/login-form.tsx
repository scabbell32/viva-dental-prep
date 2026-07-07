'use client'

import { useActionState } from 'react'
import { loginAction } from '@/app/login/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ui } from '@/lib/i18n'

export function LoginForm() {
  const [error, action, pending] = useActionState(loginAction, null)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-xl">{ui.auth.login}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">{ui.auth.email}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">{ui.auth.password}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={pending}>
            {pending ? '...' : ui.auth.loginBtn}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
