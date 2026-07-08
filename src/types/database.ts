export type Role = 'candidate' | 'admin'
export type EnglishLevel = 'beginner' | 'intermediate' | 'advanced'
export type Track = 'nbdhe' | 'jurisprudence'
export type Phase = 'written' | 'clinical'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Option = 'a' | 'b' | 'c' | 'd' | 'e' | 'f'
export type QuestionType = 'standalone' | 'case'
export type CaseType = 'patient' | 'figure' | 'text'

export interface Profile {
  id: string
  full_name: string
  role: Role
  english_level: EnglishLevel | null
  country: string | null
  spanish_mode: boolean
  created_at: string
  exam_date: string | null  // ISO date YYYY-MM-DD
  phone: string | null
}

export interface ProgramWeek {
  id: number
  week_number: number
  start_date: string
  chapter_tags: string[]
  title: string
  phase: Phase
}

export interface CaseSet {
  id: string
  chapter_tag: string
  week_number: number | null
  track: Track
  case_label: string          // 'Case A', 'Fig. 6.45', etc.
  case_type: CaseType
  patient_data: Record<string, string> | null  // structured chart for patient cases
  description: string | null  // scenario paragraph or text passage
  is_active: boolean
  created_at: string
  // Populated by join when needed
  images?: CaseImage[]
}

export interface CaseImage {
  id: string
  case_set_id: string
  image_url: string
  storage_path: string | null
  caption: string | null
  display_order: number
  created_at: string
}

export interface Question {
  id: string
  track: Track
  week_number: number | null
  chapter_tag: string | null
  question_text: string
  option_a: string
  option_b: string
  option_c: string | null
  option_d: string | null
  option_e: string | null
  option_f: string | null
  correct_option: Option
  explanation: string | null
  difficulty: Difficulty
  is_active: boolean
  created_at: string
  updated_at?: string
  // Case grouping
  case_set_id: string | null
  question_type: QuestionType
  sequence_order: number | null
  lock_option_order: boolean
  // Media (standalone questions with a single image)
  image_url: string | null
  image_urls: string[] | null
  // Spanish translations
  question_text_es: string | null
  option_a_es: string | null
  option_b_es: string | null
  option_c_es: string | null
  option_d_es: string | null
  option_e_es: string | null
  option_f_es: string | null
  explanation_es: string | null
  is_legacy: boolean
}

export interface QuizAttempt {
  id: string
  candidate_id: string
  track: Track
  week_number: number
  score: number
  total_questions: number
  answers: AnswerRecord[]
  translation_reveals: number
  mode: 'weekly' | 'review'
  completed_at: string
  duration_seconds?: number | null
}

export interface AnswerRecord {
  question_id: string
  selected_option: Option
  is_correct: boolean
  used_translation: boolean
}

/** In-quiz client state — no is_correct, no server answer data. */
export interface DraftAnswer {
  question_id: string
  selected_option: Option
  used_translation?: boolean
}

/** Full question data for admin use — includes correct_option and explanations. */
export type AdminQuestion = Question & { case_set?: CaseSetWithImages }

/** Safe to send to the browser before grading — no correct_option or explanations. */
export type SafeQuestion = Omit<
  Question,
  'correct_option' | 'explanation' | 'explanation_es' | 'is_active' | 'created_at'
> & {
  // Embedded by the quiz generator when question_type === 'case'
  case_set?: CaseSetWithImages
}

/** A case set with its images pre-loaded, ready for display in the quiz. */
export type CaseSetWithImages = CaseSet & { images: CaseImage[] }

/** A case question group: the case context + the subset of questions drawn for this quiz. */
export interface CaseQuestionGroup {
  case_set: CaseSetWithImages
  questions: SafeQuestion[]  // ordered by sequence_order
}

export interface VocabHint {
  spanish_term: string
  english_term: string
}

export interface ReviewItem {
  question_id: string
  selected_option: Option
  correct_option: Option
  is_correct: boolean
  explanation: string | null
  explanation_es: string | null
  used_translation: boolean
  related_vocab: VocabHint[]
}

export interface SubmitResponse {
  attempt_id: string
  score: number
  total: number
  translation_reveals: number
  review: ReviewItem[]
}

export interface VocabSet {
  id: string
  week_number: number
  spanish_term: string
  english_term: string
  pronunciation_tip: string | null
  category: string | null
  created_at: string
}

export interface ClozeBlank {
  index: number
  answer: string
  accept: string[]
}

export interface ClozeData {
  text: string
  blanks: ClozeBlank[]
}

export interface ListeningExercise {
  id: string
  week_number: number
  title: string
  dialogue_text: string
  cloze_text: string
  cloze_answers: string[]
  cloze: ClozeData | null
  comprehension_questions: ComprehensionQuestion[]
  is_active: boolean
  created_at: string
}

export interface ActivityCompletion {
  id: string
  candidate_id: string
  activity_type: 'vocab' | 'listening'
  week_number: number
  completed_at: string
}

export interface ComprehensionQuestion {
  question: string
  answer: string
}

export interface AdminNote {
  id: string
  candidate_id: string
  note_text: string
  created_by: string
  created_at: string
}

export interface ReadinessScore {
  candidate_id: string
  track: Track
  score_pct: number
  attempts_in_window: number
}

export type ReadinessLabel = 'not_ready' | 'approaching' | 'ready'

export function getReadinessLabel(score: number): ReadinessLabel {
  if (score >= 80) return 'ready'
  if (score >= 60) return 'approaching'
  return 'not_ready'
}

export const READINESS_LABELS: Record<ReadinessLabel, { es: string; en: string; color: string }> = {
  ready:       { es: 'Listo',         en: 'Ready',       color: 'text-green-600' },
  approaching: { es: 'Acercándose',   en: 'Approaching', color: 'text-yellow-600' },
  not_ready:   { es: 'No listo',      en: 'Not Ready',   color: 'text-red-500' },
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Profile>
        Relationships: []
      }
      program_weeks: {
        Row: ProgramWeek
        Insert: Omit<ProgramWeek, 'id'>
        Update: Partial<ProgramWeek>
        Relationships: []
      }
      case_sets: {
        Row: CaseSet
        Insert: Omit<CaseSet, 'id' | 'created_at' | 'images'>
        Update: Partial<Omit<CaseSet, 'images'>>
        Relationships: []
      }
      case_images: {
        Row: CaseImage
        Insert: Omit<CaseImage, 'id' | 'created_at'>
        Update: Partial<CaseImage>
        Relationships: []
      }
      questions: {
        Row: Question
        Insert: Omit<Question, 'id' | 'created_at'>
        Update: Partial<Question>
        Relationships: []
      }
      quiz_attempts: {
        Row: QuizAttempt
        Insert: Omit<QuizAttempt, 'id' | 'completed_at'>
        Update: Partial<QuizAttempt>
        Relationships: []
      }
      vocab_sets: {
        Row: VocabSet
        Insert: Omit<VocabSet, 'id' | 'created_at'>
        Update: Partial<VocabSet>
        Relationships: []
      }
      listening_exercises: {
        Row: ListeningExercise
        Insert: Omit<ListeningExercise, 'id' | 'created_at'>
        Update: Partial<ListeningExercise>
        Relationships: []
      }
      admin_notes: {
        Row: AdminNote
        Insert: Omit<AdminNote, 'id' | 'created_at'>
        Update: Partial<AdminNote>
        Relationships: []
      }
    }
    Views: {
      readiness_scores: {
        Row: ReadinessScore
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
