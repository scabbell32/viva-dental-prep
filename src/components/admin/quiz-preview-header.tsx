'use client'

import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'

export function QuizPreviewHeader({ date, week }: { date: string; week: number }) {
  const router = useRouter()

  return (
    <div className="flex items-center justify-between flex-wrap gap-4 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Quiz Diario — Vista Previa</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Semana {week} · NBDHE
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Label htmlFor="quiz-date" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          FECHA DEL QUIZ:
        </Label>
        <input
          type="date"
          id="quiz-date"
          value={date}
          onChange={e => {
            if (e.target.value) {
              router.push(`/admin/quiz-preview?date=${e.target.value}`)
            }
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
        />
      </div>
    </div>
  )
}
