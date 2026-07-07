'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ui } from '@/lib/i18n'
import type { VocabSet } from '@/types/database'

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function buildMCOptions(term: VocabSet, allTerms: VocabSet[]): { text: string; correct: boolean }[] {
  const distractors = shuffle(allTerms.filter(t => t.id !== term.id)).slice(0, 3)
  const opts = shuffle([
    { text: term.english_term, correct: true },
    ...distractors.map(d => ({ text: d.english_term, correct: false })),
  ])
  return opts
}

// ─── Flashcard Mode ───────────────────────────────────────────────
function FlashcardMode({ vocab }: { vocab: VocabSet[] }) {
  const [deck] = useState(() => shuffle(vocab))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const card = deck[index]
  if (!card) return null

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400 text-center">{index + 1} / {deck.length}</p>
      <Card
        className="cursor-pointer select-none min-h-48 flex items-center justify-center"
        onClick={() => setFlipped(f => !f)}
      >
        <CardContent className="text-center pt-8 pb-8 space-y-3">
          <Badge variant="outline" className="text-xs">{flipped ? ui.vocab.english : ui.vocab.spanish}</Badge>
          <p className="text-2xl font-bold text-gray-800">
            {flipped ? card.english_term : card.spanish_term}
          </p>
          {flipped && card.pronunciation_tip && (
            <p className="text-sm text-teal-600 italic">{card.pronunciation_tip}</p>
          )}
          {!flipped && (
            <p className="text-xs text-gray-400 mt-4">Toca para ver en inglés</p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-center">
        <Button
          variant="outline"
          onClick={() => { setIndex(i => Math.max(0, i - 1)); setFlipped(false) }}
          disabled={index === 0}
        >
          ← Anterior
        </Button>
        <Button
          className="bg-teal-600 hover:bg-teal-700"
          onClick={() => { setIndex(i => Math.min(deck.length - 1, i + 1)); setFlipped(false) }}
          disabled={index === deck.length - 1}
        >
          {ui.vocab.next} →
        </Button>
      </div>
    </div>
  )
}

// ─── Multiple Choice Mode ─────────────────────────────────────────
function MCMode({ vocab, onComplete }: { vocab: VocabSet[]; onComplete?: () => void }) {
  const [deck] = useState(() => shuffle(vocab))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const card = deck[index]
  const options = card ? buildMCOptions(card, vocab) : []

  function pick(text: string, correct: boolean) {
    if (selected) return
    setSelected(text)
    if (correct) setScore(s => s + 1)
  }

  function next() {
    setSelected(null)
    if (index + 1 >= deck.length) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
    }
  }

  useEffect(() => {
    if (done) onComplete?.()
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  if (done) {
    const pct = Math.round((score / deck.length) * 100)
    return (
      <div className="text-center space-y-4 py-8">
        <p className="text-5xl font-bold text-teal-700">{pct}%</p>
        <p className="text-gray-500">{score} / {deck.length} correctas</p>
        <Button onClick={() => { setIndex(0); setSelected(null); setScore(0); setDone(false) }} className="bg-teal-600 hover:bg-teal-700">
          Intentar de nuevo
        </Button>
      </div>
    )
  }

  if (!card) return null

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400 text-center">{index + 1} / {deck.length}</p>
      <Card>
        <CardContent className="pt-6 pb-4 space-y-4">
          <p className="text-center text-xl font-semibold text-gray-800">{card.spanish_term}</p>
          <div className="space-y-2">
            {options.map((opt, i) => {
              let style = 'border-gray-200 hover:border-teal-400 cursor-pointer'
              if (selected) {
                if (opt.correct) style = 'border-green-500 bg-green-50'
                else if (opt.text === selected) style = 'border-red-400 bg-red-50'
                else style = 'border-gray-200 opacity-40'
              }
              return (
                <button
                  key={i}
                  onClick={() => pick(opt.text, opt.correct)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all text-sm ${style}`}
                >
                  {opt.text}
                </button>
              )
            })}
          </div>
          {selected && (
            <Button onClick={next} className="w-full bg-teal-600 hover:bg-teal-700">
              {index + 1 === deck.length ? 'Ver Resultado' : ui.vocab.next}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

async function markVocabComplete(weekNumber: number) {
  await fetch('/api/activity/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activity_type: 'vocab', week_number: weekNumber }),
  })
}

// ─── Parent ───────────────────────────────────────────────────────
export function VocabDrills({ vocab, weekNumber }: { vocab: VocabSet[]; weekNumber: number }) {
  return (
    <Tabs defaultValue="flashcard">
      <TabsList className="w-full mb-6">
        <TabsTrigger value="flashcard" className="flex-1">{ui.vocab.flashcard}</TabsTrigger>
        <TabsTrigger value="mc" className="flex-1">{ui.vocab.mc}</TabsTrigger>
      </TabsList>
      <TabsContent value="flashcard"><FlashcardMode vocab={vocab} /></TabsContent>
      <TabsContent value="mc"><MCMode vocab={vocab} onComplete={() => markVocabComplete(weekNumber)} /></TabsContent>
    </Tabs>
  )
}
