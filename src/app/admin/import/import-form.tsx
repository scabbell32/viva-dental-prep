'use client'

import { useActionState, useState } from 'react'
import { importQuestions, importVocab } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ImportResult = { inserted: number; skipped: number; errors: string[] }

function ImportSection({
  title,
  description,
  templateHeaders,
  templateExample,
  action,
}: {
  title: string
  description: string
  templateHeaders: string
  templateExample: string
  action: (prev: ImportResult | null, formData: FormData) => Promise<ImportResult>
}) {
  const [result, formAction, pending] = useActionState(action, null)
  const [fileName, setFileName] = useState('')

  function downloadTemplate() {
    const csv = templateHeaders + '\n' + templateExample
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `template_${title.toLowerCase().replace(/\s+/g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-gray-500">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          type="button"
          onClick={downloadTemplate}
          className="text-sm text-teal-600 hover:underline"
        >
          Descargar plantilla CSV →
        </button>

        <form action={formAction} className="space-y-3">
          <label className="block">
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-teal-400 transition-colors">
              <input
                type="file"
                name="file"
                accept=".csv"
                className="sr-only"
                onChange={e => setFileName(e.target.files?.[0]?.name ?? '')}
                required
              />
              {fileName ? (
                <p className="text-sm text-teal-700 font-medium">{fileName}</p>
              ) : (
                <p className="text-sm text-gray-400">Haz clic para seleccionar archivo CSV</p>
              )}
            </div>
          </label>

          <Button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700"
            disabled={pending || !fileName}
          >
            {pending ? 'Importando...' : 'Importar'}
          </Button>
        </form>

        {result && (
          <div className={`rounded-lg p-4 text-sm space-y-2 ${result.inserted > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className="font-semibold">
              ✓ {result.inserted} importados &nbsp;·&nbsp; {result.skipped} omitidos
            </p>
            {result.errors.length > 0 && (
              <ul className="space-y-1 text-red-600 max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const QUESTION_HEADERS = 'question_text,option_a,option_b,option_c,option_d,correct_option,explanation,difficulty,track,week_number,chapter_tag'
const QUESTION_EXAMPLE = '"Which tissue covers the crown of the tooth?","Enamel","Dentin","Cementum","Pulp","a","Enamel is the hardest tissue and covers the crown","easy","nbdhe","1","ch2"'

const VOCAB_HEADERS = 'spanish_term,english_term,pronunciation_tip,category,week_number'
const VOCAB_EXAMPLE = 'Esmalte,Enamel,"EH-na-mel",Tooth Tissues,1'

export function ImportForms() {
  return (
    <div className="space-y-6">
      <ImportSection
        title="Importar Preguntas"
        description="Sube un CSV con preguntas de opción múltiple. Columnas requeridas: question_text, option_a–d, correct_option (a/b/c/d), track (nbdhe/jurisprudence), week_number (1–20)."
        templateHeaders={QUESTION_HEADERS}
        templateExample={QUESTION_EXAMPLE}
        action={importQuestions}
      />
      <ImportSection
        title="Importar Vocabulario"
        description="Sube un CSV con términos bilingües. Columnas requeridas: spanish_term, english_term, week_number (1–20)."
        templateHeaders={VOCAB_HEADERS}
        templateExample={VOCAB_EXAMPLE}
        action={importVocab}
      />
    </div>
  )
}
