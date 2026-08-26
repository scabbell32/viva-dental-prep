'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export interface QuizDateInfo {
  date: string
  status: 'draft' | 'published'
  questionCount?: number
}

interface QuizCalendarProps {
  selectedDate: string
  quizzes: QuizDateInfo[]
  onSelectDate?: (date: string) => void
  navigationUrl?: string // e.g. '/admin/quiz-preview'
  compact?: boolean
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function QuizCalendar({
  selectedDate,
  quizzes,
  onSelectDate,
  navigationUrl,
  compact = false,
}: QuizCalendarProps) {
  const router = useRouter()

  // Parse current selected date or fallback to today
  const initialDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date()
  const [currentYear, setCurrentYear] = useState(
    isNaN(initialDate.getFullYear()) ? new Date().getFullYear() : initialDate.getFullYear()
  )
  const [currentMonth, setCurrentMonth] = useState(
    isNaN(initialDate.getMonth()) ? new Date().getMonth() : initialDate.getMonth()
  )

  // Map quiz date to quiz info for O(1) lookups
  const quizMap = new Map<string, QuizDateInfo>()
  quizzes.forEach(q => quizMap.set(q.date, q))

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(y => y - 1)
    } else {
      setCurrentMonth(m => m - 1)
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(y => y + 1)
    } else {
      setCurrentMonth(m => m + 1)
    }
  }

  function goToToday() {
    const today = new Date()
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
    const todayStr = today.toISOString().slice(0, 10)
    handleDateClick(todayStr)
  }

  function handleDateClick(dateStr: string) {
    if (onSelectDate) {
      onSelectDate(dateStr)
    }
    if (navigationUrl) {
      router.push(`${navigationUrl}?date=${dateStr}`)
    }
  }

  // Days calculation for current month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const todayStr = new Date().toISOString().slice(0, 10)

  // Array of days
  const calendarDays: (string | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    calendarDays.push(dStr)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 capitalize">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h3>
            <p className="text-[11px] text-gray-400">
              Selecciona una fecha para ver o programar el Quiz
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="h-7 text-xs px-2 text-gray-600 hover:text-indigo-600 font-medium"
          >
            Hoy
          </Button>
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-600 transition"
            title="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-600 transition"
            title="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_NAMES.map((name, i) => (
          <span key={name} className={`text-[11px] font-semibold py-1 ${i === 0 || i === 6 ? 'text-gray-400' : 'text-gray-500'}`}>
            {name}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dateStr, idx) => {
          if (!dateStr) {
            return <div key={`empty-${idx}`} className="h-9 sm:h-10" />
          }

          const dayNum = parseInt(dateStr.slice(8, 10), 10)
          const quiz = quizMap.get(dateStr)
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === todayStr

          let bgClass = 'bg-white hover:bg-indigo-50 border-gray-200 text-gray-700'
          let statusDot = null

          if (quiz) {
            if (quiz.status === 'published') {
              bgClass = isSelected
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-400'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              statusDot = <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
            } else if (quiz.status === 'draft') {
              bgClass = isSelected
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-300'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              statusDot = <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500'}`} />
            }
          } else if (isSelected) {
            bgClass = 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-300 font-bold'
          }

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => handleDateClick(dateStr)}
              className={`relative h-9 sm:h-10 rounded-lg border flex flex-col items-center justify-center p-0.5 transition-all text-xs cursor-pointer ${bgClass} ${
                isToday && !isSelected && !quiz ? 'ring-1 ring-indigo-400 font-bold' : ''
              }`}
              title={
                quiz
                  ? `${dateStr}: Quiz ${quiz.status === 'published' ? 'Publicado' : 'Borrador'} (${quiz.questionCount ?? 0} preguntas)`
                  : `${dateStr}: Sin Quiz (Disponible para programar)`
              }
            >
              <span className="font-semibold leading-none">{dayNum}</span>
              {statusDot && (
                <div className="absolute bottom-1 flex items-center justify-center">
                  {statusDot}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend & Stats */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2 text-[11px] text-gray-500">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
            <span>Quiz Publicado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" />
            <span>Borrador (Draft)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block" />
            <span>Sin Quiz (Disponible)</span>
          </div>
        </div>

        {selectedDate && (
          <div className="text-right font-medium text-gray-700">
            Fecha seleccionada: <span className="font-bold text-indigo-600">{selectedDate}</span>
          </div>
        )}
      </div>
    </div>
  )
}
