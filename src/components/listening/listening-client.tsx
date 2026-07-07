'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ui } from '@/lib/i18n'
import type { ListeningExercise, ClozeBlank } from '@/types/database'

function normalize(s: string): string {
  return s.toLowerCase().trim().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function isAccepted(input: string, accept: string[]): boolean {
  const n = normalize(input)
  return accept.some(a => normalize(a) === n)
}

async function markListeningComplete(weekNumber: number) {
  await fetch('/api/activity/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activity_type: 'listening', week_number: weekNumber }),
  })
}

function ExerciseCard({ exercise }: { exercise: ListeningExercise }) {
  const useStructured = Boolean(exercise.cloze)
  const blankCount = useStructured
    ? (exercise.cloze?.blanks.length ?? 0)
    : exercise.cloze_answers.length

  const [phase, setPhase] = useState<'read' | 'cloze' | 'comprehension' | 'done'>('read')
  const [clozeAnswers, setClozeAnswers] = useState<string[]>(Array(blankCount).fill(''))
  const [clozeChecked, setClozeChecked] = useState(false)
  const [compAnswers, setCompAnswers] = useState<string[]>(
    Array(exercise.comprehension_questions.length).fill('')
  )
  const [compChecked, setCompChecked] = useState(false)

  function checkCloze() { setClozeChecked(true) }

  function checkComp() {
    setCompChecked(true)
    markListeningComplete(exercise.week_number)
  }

  // ── Structured cloze renderer ──────────────────────────────────────────────
  function renderStructuredCloze(blanks: ClozeBlank[], text: string) {
    // Split on {0}, {1}, etc.
    const parts = text.split(/\{(\d+)\}/g)
    // parts alternates: text, index, text, index, ...
    return (
      <div className="space-y-2 leading-loose">
        <span>
          {parts.map((part, i) => {
            if (i % 2 === 0) return <span key={i}>{part}</span>
            const bi = parseInt(part, 10)
            const blank = blanks.find(b => b.index === bi)
            if (!blank) return null
            const answer = clozeAnswers[bi] ?? ''
            const correct = clozeChecked && isAccepted(answer, blank.accept)
            const wrong = clozeChecked && !correct
            return (
              <span key={i} className="inline-block mx-1">
                {clozeChecked ? (
                  <span className={`font-semibold px-1 rounded ${correct ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                    {answer || '(vacío)'}
                    {wrong && <span className="text-green-700 ml-1">→ {blank.answer}</span>}
                  </span>
                ) : (
                  <Input
                    value={answer}
                    onChange={e => {
                      const updated = [...clozeAnswers]
                      updated[bi] = e.target.value
                      setClozeAnswers(updated)
                    }}
                    className="inline-block w-28 h-7 text-sm px-2 align-middle"
                  />
                )}
              </span>
            )
          })}
        </span>
      </div>
    )
  }

  // ── Legacy cloze renderer (fallback for unbackfilled rows) ─────────────────
  function renderLegacyCloze() {
    let blankIndex = 0
    const parts = exercise.cloze_text.split('_____')
    return (
      <div className="space-y-2 leading-loose">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (() => {
              const bi = blankIndex++
              const correct = exercise.cloze_answers[bi]
              const answer = clozeAnswers[bi] ?? ''
              const isCorrect = clozeChecked && normalize(answer) === normalize(correct ?? '')
              const isWrong = clozeChecked && !isCorrect
              return (
                <span className="inline-block mx-1">
                  {clozeChecked ? (
                    <span className={`font-semibold px-1 rounded ${isCorrect ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                      {answer || '(vacío)'}
                      {isWrong && <span className="text-green-700 ml-1">→ {correct}</span>}
                    </span>
                  ) : (
                    <Input
                      value={answer}
                      onChange={e => {
                        const updated = [...clozeAnswers]
                        updated[bi] = e.target.value
                        setClozeAnswers(updated)
                      }}
                      className="inline-block w-28 h-7 text-sm px-2 align-middle"
                    />
                  )}
                </span>
              )
            })()}
          </span>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Sem. {exercise.week_number}</Badge>
          <CardTitle className="text-base">{exercise.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={phase} onValueChange={v => setPhase(v as typeof phase)}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="read" className="flex-1">{ui.listening.dialogue}</TabsTrigger>
            <TabsTrigger value="cloze" className="flex-1">{ui.listening.fill}</TabsTrigger>
            <TabsTrigger value="comprehension" className="flex-1">{ui.listening.comprehension}</TabsTrigger>
          </TabsList>

          <TabsContent value="read">
            <div className="bg-gray-50 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-line text-gray-800">
              {exercise.dialogue_text}
            </div>
            <Button className="mt-4 bg-teal-600 hover:bg-teal-700" onClick={() => setPhase('cloze')}>
              Continuar →
            </Button>
          </TabsContent>

          <TabsContent value="cloze">
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              {useStructured && exercise.cloze
                ? renderStructuredCloze(exercise.cloze.blanks, exercise.cloze.text)
                : renderLegacyCloze()}
            </div>
            {!clozeChecked ? (
              <Button className="mt-4 bg-teal-600 hover:bg-teal-700" onClick={checkCloze}>
                {ui.listening.check}
              </Button>
            ) : (
              <Button className="mt-4 bg-teal-600 hover:bg-teal-700" onClick={() => setPhase('comprehension')}>
                Continuar →
              </Button>
            )}
          </TabsContent>

          <TabsContent value="comprehension">
            <div className="space-y-4">
              {exercise.comprehension_questions.map((q, i) => (
                <div key={i} className="space-y-2">
                  <p className="font-medium text-sm">{i + 1}. {q.question}</p>
                  {compChecked ? (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 italic">Tu respuesta: {compAnswers[i] || '(vacío)'}</p>
                      <p className="text-sm text-green-700 font-medium">Respuesta modelo: {q.answer}</p>
                    </div>
                  ) : (
                    <Input
                      value={compAnswers[i]}
                      onChange={e => {
                        const updated = [...compAnswers]
                        updated[i] = e.target.value
                        setCompAnswers(updated)
                      }}
                      placeholder="Escribe tu respuesta..."
                    />
                  )}
                </div>
              ))}
              {!compChecked && (
                <Button className="bg-teal-600 hover:bg-teal-700" onClick={checkComp}>
                  {ui.listening.check}
                </Button>
              )}
              {compChecked && (
                <p className="text-sm text-teal-700 font-semibold">¡Ejercicio completado! ✓</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export function ListeningClient({ exercises }: { exercises: ListeningExercise[] }) {
  return (
    <div className="space-y-6">
      {exercises.map(ex => <ExerciseCard key={ex.id} exercise={ex} />)}
    </div>
  )
}
