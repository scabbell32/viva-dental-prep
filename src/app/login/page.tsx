export const dynamic = 'force-dynamic'

import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-teal-700">Viva Dental Prep</h1>
          <p className="text-gray-500 mt-1">Bienvenido / Welcome</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
