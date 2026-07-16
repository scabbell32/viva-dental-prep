export const dynamic = 'force-dynamic'

import { ForgotPasswordForm } from '@/components/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-teal-700">Viva Dental Prep</h1>
          <p className="text-gray-500 mt-1">Bilingual Board Review / Preparación Bilingüe</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
