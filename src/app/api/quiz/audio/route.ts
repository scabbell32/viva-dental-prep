import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!
const TTS_MODEL = 'gemini-2.5-flash-preview-tts'
const VOICE = 'Kore'

const STYLE_PREFIX = 'Say the following in Spanish, speaking slowly, warmly and clearly, like a clinical teacher explaining to fellow Spanish-speaking dental colleagues. Pronounce English words clearly and instructively. Make natural pauses between ideas.\n\n'

function pcmToWav(pcmData: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = sampleRate * numChannels * bitsPerSample / 8
  const blockAlign = numChannels * bitsPerSample / 8
  const dataSize = pcmData.length
  const header = Buffer.alloc(44)

  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)           // PCM
  header.writeUInt16LE(numChannels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(dataSize, 40)

  return Buffer.concat([header, pcmData])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { script } = await request.json()
  if (!script) return NextResponse.json({ error: 'script required' }, { status: 400 })

  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: STYLE_PREFIX + script }]
    }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: VOICE }
        }
      }
    }
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${GOOGLE_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )

  if (!res.ok) {
    const err = await res.json()
    return NextResponse.json({ error: err.error?.message ?? 'TTS failed' }, { status: 500 })
  }

  const data = await res.json()
  const part = data.candidates?.[0]?.content?.parts?.[0]
  if (!part?.inlineData?.data) {
    return NextResponse.json({ error: 'No audio in response' }, { status: 500 })
  }

  const mimeType: string = part.inlineData.mimeType ?? ''
  const rawBuffer = Buffer.from(part.inlineData.data, 'base64')

  // Gemini TTS returns raw L16 PCM — convert to WAV so browsers can play it
  const isPcm = mimeType.includes('L16') || mimeType.includes('pcm')
  const rateMatch = mimeType.match(/rate=(\d+)/)
  const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000
  const audioBuffer = isPcm ? pcmToWav(rawBuffer, sampleRate) : rawBuffer
  const contentType = isPcm ? 'audio/wav' : mimeType || 'audio/wav'

  return new NextResponse(new Uint8Array(audioBuffer), {
    headers: {
      'Content-Type': contentType,
      'Content-Length': audioBuffer.length.toString(),
    }
  })
}
