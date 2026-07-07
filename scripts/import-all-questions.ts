import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const QUESTIONS_DIR = path.join(__dirname, '../../dental hygiene/questions')

const CHAPTER_MAP: Record<number, { tag: string; week: number }> = {
  2: { tag: 'ch2', week: 1 },
  3: { tag: 'ch3', week: 1 },
  4: { tag: 'ch4', week: 2 },
  5: { tag: 'ch5', week: 2 },
  6: { tag: 'ch2', week: 1 },
  7: { tag: 'ch9', week: 5 },
  8: { tag: 'ch8', week: 4 },
  9: { tag: 'ch7', week: 4 },
  10: { tag: 'ch6', week: 3 },
  11: { tag: 'ch11', week: 6 },
  12: { tag: 'ch12', week: 7 },
  13: { tag: 'ch13', week: 7 },
  14: { tag: 'ch14', week: 8 },
  15: { tag: 'ch15', week: 9 },
  16: { tag: 'ch16', week: 9 },
  17: { tag: 'ch17', week: 8 },
  18: { tag: 'ch18', week: 10 },
  19: { tag: 'ch19', week: 11 },
  20: { tag: 'ch20', week: 11 },
  21: { tag: 'ch21', week: 10 },
  22: { tag: 'ch22', week: 12 }
}

interface ParsedQuestion {
  number: number
  statement: string
  options: Record<string, string>
  case_title: string | null
  case_synopsis: string | null
}

interface ParsedAnswer {
  number: number
  correct_answer: string
  correct_text: string
  explanation: string
}

function parseCleanQuestionsAndCases(filePath: string): ParsedQuestion[] {
  if (!fs.existsSync(filePath)) return []
  let content = fs.readFileSync(filePath, 'utf-8')

  // Standardize headers
  content = content.replace(/\*\*Q(\d+)\.\*\*/g, '### **Q$1.')

  // Find all level-2 headers that do not start with a third hash
  const headersWithIndices: { start: number; text: string } = [] as any
  const headerRegex = /^##\s+([^#].*)/gm
  let match
  while ((match = headerRegex.exec(content)) !== null) {
    headersWithIndices.push({
      start: match.index,
      text: match[1].trim()
    } as any)
  }

  // Find all question headers
  const qMatches: { start: number; number: number }[] = []
  const qRegex = /### \*\*Q(\d+)\./g
  while ((match = qRegex.exec(content)) !== null) {
    qMatches.push({
      start: match.index,
      number: parseInt(match[1], 10)
    })
  }

  const questions: ParsedQuestion[] = []

  for (let idx = 0; idx < qMatches.length; idx++) {
    const qm = qMatches[idx]
    const qStart = qm.start
    const qNum = qm.number

    // Find the last header that appears before this question
    let lastHeader: { start: number; text: string } | null = null
    for (const h of headersWithIndices as any[]) {
      if (h.start < qStart) {
        lastHeader = h
      } else {
        break
      }
    }

    let caseTitle: string | null = null
    let caseSynopsis: string | null = null

    if (lastHeader) {
      const hText = lastHeader.text
      if (hText.toLowerCase().startsWith('case')) {
        caseTitle = hText
        // Find the first question after this header
        let firstQAfterHeader: { start: number } | null = null
        for (const q of qMatches) {
          if (q.start > lastHeader.start) {
            firstQAfterHeader = q
            break
          }
        }
        if (firstQAfterHeader) {
          const rawSynopsis = content.slice(
            lastHeader.start + lastHeader.text.length + 3,
            firstQAfterHeader.start
          ).trim()
          
          // Clean up synopsis lines
          const cleanLines = rawSynopsis
            .split('\n')
            .map(line => line.trim())
            .filter(line => !line.toLowerCase().startsWith('*use case'))
          
          caseSynopsis = cleanLines.join('\n').trim()
        }
      }
    }

    // Extract the block for this question
    const qEnd = idx + 1 < qMatches.length ? qMatches[idx + 1].start : content.length
    const qBlock = content.slice(qStart, qEnd)
    const lines = qBlock.split('\n')
    const headerLine = lines[0].trim()

    const mStmt = headerLine.match(/^### \*\*Q\d+[\.\s]+(.*?)(?:\*\*|$)/)
    const statement = mStmt ? mStmt[1].trim() : headerLine

    const options: Record<string, string> = {}
    for (let i = 1; i < lines.length; i++) {
      const lineTrimmed = lines[i].trim()
      if (!lineTrimmed) continue

      const optM = lineTrimmed.match(/^(?:-\s+\*\*|)([a-e])(?:\.\*\*|\.)\s*(.*)/i)
      if (optM) {
        const letter = optM[1].toLowerCase()
        options[letter] = optM[2].trim()
      }
    }

    questions.push({
      number: qNum,
      statement,
      options,
      case_title: caseTitle,
      case_synopsis: caseSynopsis
    })
  }

  return questions
}

function parseAnswersAndRationales(filePath: string): ParsedAnswer[] {
  if (!fs.existsSync(filePath)) return []
  let content = fs.readFileSync(filePath, 'utf-8')

  content = content.replace(/\*\*Q(\d+)\.\*\*/g, '### **Q$1.')

  const blocks = content.split('### **Q')
  const answers: ParsedAnswer[] = []

  for (const block of blocks) {
    if (!block.trim() || block.startsWith('#')) continue
    const lines = block.split('\n')
    const header = lines[0].trim()

    const m = header.match(/^(\d+)[\.\s]+(.*?)(?:\*\*|$)/)
    if (!m) continue
    const qNum = parseInt(m[1], 10)

    let correct_answer = ''
    let correct_text = ''
    const rationaleLines: string[] = []
    let collectingRationale = false

    for (let i = 1; i < lines.length; i++) {
      const lineTrimmed = lines[i].trim()
      if (!lineTrimmed) continue

      const ansM = lineTrimmed.match(/^\*\s+\*\*Correct\s+Answer:\*\*\s+\*\*([a-eA-E])(?:\.|\.\*\*)\s*(.*?)(?:\*\*|$)/i)
      if (ansM) {
        correct_answer = ansM[1].toLowerCase()
        correct_text = ansM[2].trim()
        continue
      }

      if (lineTrimmed.toLowerCase().includes('clinical rationale:')) {
        collectingRationale = true
        const mRat = lineTrimmed.match(/clinical rationale:\*\*?\s*(.*)/i)
        if (mRat && mRat[1].trim()) {
          rationaleLines.push(mRat[1].trim())
        }
        continue
      }

      if (collectingRationale) {
        if (lineTrimmed.startsWith('---')) {
          collectingRationale = false
        } else {
          rationaleLines.push(lineTrimmed)
        }
      }
    }

    const explanation = rationaleLines.join('\n').trim()
    answers.push({
      number: qNum,
      correct_answer,
      correct_text,
      explanation
    })
  }

  return answers
}

async function main() {
  console.log('=== Starting Supabase Question & Case study Importer ===')

  // Clean up existing nbdhe track questions and case studies
  console.log('Cleaning up existing NBDHE track questions...')
  const { error: deleteQE } = await supabase
    .from('questions')
    .delete()
    .eq('track', 'nbdhe')

  if (deleteQE) {
    console.error('Failed to clean up questions:', deleteQE.message)
    process.exit(1)
  }

  console.log('Cleaning up existing case studies...')
  const { error: deleteCE } = await supabase
    .from('case_studies')
    .delete()
    .neq('title', 'placeholder_to_bypass_empty_delete')

  if (deleteCE) {
    console.error('Failed to clean up case studies:', deleteCE.message)
    process.exit(1)
  }
  console.log('Cleanup successful!\n')

  const caseCache = new Map<string, string>() // synopsis -> case_study_id
  let totalInsertedQs = 0
  let totalInsertedCases = 0

  for (let ch = 2; ch <= 22; ch++) {
    const cleanPath = path.join(QUESTIONS_DIR, `Chapter_{ch}_Questions_Clean.md`).replace('{ch}', String(ch))
    const ratPath = path.join(QUESTIONS_DIR, `Chapter_{ch}_Answers_and_Rationales.md`).replace('{ch}', String(ch))

    if (!fs.existsSync(cleanPath) || !fs.existsSync(ratPath)) {
      console.log(`Skipping Chapter ${ch} (files do not exist)`)
      continue
    }

    const questions = parseCleanQuestionsAndCases(cleanPath)
    const answers = parseAnswersAndRationales(ratPath)

    if (questions.length !== answers.length) {
      console.warn(`[WARNING] Chapter ${ch} mismatch: parsed ${questions.length} questions and ${answers.length} answers! Using answers length.`)
    }

    const mapInfo = CHAPTER_MAP[ch]
    if (!mapInfo) {
      console.error(`No week/tag mapping found for Chapter ${ch}`)
      continue
    }

    console.log(`Processing Chapter ${ch} (Mapping to week ${mapInfo.week}, tag "${mapInfo.tag}")...`)
    const insertRows: any[] = []

    for (let idx = 0; idx < answers.length; idx++) {
      const ans = answers[idx]
      const q = questions[idx] ?? { statement: '[Question statement missing]', options: {}, case_title: null, case_synopsis: null }

      let optA = q.options['a'] || ''
      let optB = q.options['b'] || ''
      let optC = q.options['c'] || ''
      let optD = q.options['d'] || ''
      let optE = q.options['e'] || ''
      let correctOpt = ans.correct_answer

      // Option E conversion
      if (optE) {
        if (correctOpt === 'e') {
          optD = optE
          correctOpt = 'd'
        }
      }

      // Check constraints and fallbacks
      if (!optA || !optB || !optC || !optD) {
        optA = optA || 'Option A'
        optB = optB || 'Option B'
        optC = optC || 'Option C'
        optD = optD || 'Option D'
      }

      if (!['a', 'b', 'c', 'd'].includes(correctOpt)) {
        correctOpt = 'a'
      }

      // Handle Case Study Insertion/Linking
      let caseStudyId: string | null = null
      if (q.case_title && q.case_synopsis) {
        const cacheKey = q.case_synopsis.trim()
        if (caseCache.has(cacheKey)) {
          caseStudyId = caseCache.get(cacheKey)!
        } else {
          // Insert new Case Study
          const { data: csData, error: csErr } = await supabase
            .from('case_studies')
            .insert({
              title: q.case_title,
              synopsis: q.case_synopsis
            })
            .select()

          if (csErr) {
            console.error(`  Error inserting case study "${q.case_title}":`, csErr.message)
          } else if (csData && csData[0]) {
            caseStudyId = csData[0].id
            caseCache.set(cacheKey, caseStudyId!)
            totalInsertedCases++
          }
        }
      }

      insertRows.push({
        track: 'nbdhe',
        week_number: mapInfo.week,
        chapter_tag: mapInfo.tag,
        question_text: q.statement,
        option_a: optA,
        option_b: optB,
        option_c: optC,
        option_d: optD,
        correct_option: correctOpt,
        explanation: ans.explanation || null,
        difficulty: 'medium',
        is_active: true,
        case_study_id: caseStudyId
      })
    }

    // Batch insert questions
    const BATCH_SIZE = 50
    for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
      const batch = insertRows.slice(i, i + BATCH_SIZE)
      const { error } = await supabase.from('questions').insert(batch)
      if (error) {
        console.error(`  Error inserting questions batch for Chapter ${ch}:`, error.message)
      } else {
        totalInsertedQs += batch.length
      }
    }
    console.log(`  Finished Chapter ${ch}: inserted ${insertRows.length} questions.`)
  }

  console.log(`\nImport complete!`)
  console.log(`Total Case Studies inserted: ${totalInsertedCases}`)
  console.log(`Total Questions inserted: ${totalInsertedQs}`)
}

main().catch(console.error)
