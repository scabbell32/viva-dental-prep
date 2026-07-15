import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 })
    }

    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 })
    }

    const body = await req.json()
    const {
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      option_e,
      option_f,
      explanation,
      case_study
    } = body

    if (!question_text || !option_a || !option_b) {
      return NextResponse.json({ error: 'Missing required English fields (question_text, option_a, option_b)' }, { status: 400 })
    }

    const payload: any = {
      question_text,
      option_a,
      option_b,
      option_c: option_c || '',
      option_d: option_d || '',
      option_e: option_e || '',
      option_f: option_f || '',
      explanation: explanation || '',
    }

    if (case_study) {
      payload.case_study_title = case_study.title || ''
      payload.case_study_synopsis = case_study.synopsis || ''
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
    if (!GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'Server configuration error: GOOGLE_API_KEY is missing' }, { status: 500 })
    }

    const prompt = `You are an expert translator specializing in dental hygiene board exams (NBDHE). Translate the following question, choices, explanation, and case study (if present) into professional dental Spanish (used in Latin America and Spain). Preserve clinical meanings and technical terms accurately.

Return a JSON object matching this schema:
{
  "question_text_es": "translated question",
  "option_a_es": "translated option A",
  "option_b_es": "translated option B",
  "option_c_es": "translated option C, or null if option_c was empty",
  "option_d_es": "translated option D, or null if option_d was empty",
  "option_e_es": "translated option E, or null if option_e was empty",
  "option_f_es": "translated option F, or null if option_f was empty",
  "explanation_es": "translated explanation/rationale, or null if empty",
  "case_study_title_es": "translated case study title, or null if not present",
  "case_study_synopsis_es": "translated case study synopsis, or null if not present"
}

Here is the English data to translate:
${JSON.stringify(payload, null, 2)}`

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GOOGLE_API_KEY}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `Gemini API error: ${response.status} - ${errorText}` }, { status: 502 })
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return NextResponse.json({ error: 'Gemini returned an empty response' }, { status: 500 })
    }

    const translated = JSON.parse(text.trim())
    return NextResponse.json(translated)
  } catch (e) {
    console.error('Translation endpoint error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
