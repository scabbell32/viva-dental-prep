-- 1. Create Case Studies Table
CREATE TABLE IF NOT EXISTS public.case_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,                  -- English title (e.g. "Case A: Pediatric")
  title_es TEXT,                        -- Spanish translation of title
  synopsis TEXT NOT NULL,               -- English patient history/vitals
  synopsis_es TEXT,                     -- Spanish translation of patient history
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for Case Studies
ALTER TABLE public.case_studies ENABLE ROW LEVEL SECURITY;

-- Add policies safely using DO block to avoid duplicate errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'case_studies' AND policyname = 'Anyone authenticated can read case studies'
  ) THEN
    CREATE POLICY "Anyone authenticated can read case studies"
      ON public.case_studies FOR SELECT
      USING (auth.uid() is not null);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'case_studies' AND policyname = 'Admin can manage case studies'
  ) THEN
    CREATE POLICY "Admin can manage case studies"
      ON public.case_studies FOR ALL
      USING (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
  END IF;
END
$$;

-- 2. Alter Questions Table to Add Cases, Images, and Translations
-- Check if columns exist before adding them to prevent duplicate errors
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='case_study_id') THEN
    ALTER TABLE public.questions ADD COLUMN case_study_id UUID REFERENCES public.case_studies(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='image_url') THEN
    ALTER TABLE public.questions ADD COLUMN image_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='question_text_es') THEN
    ALTER TABLE public.questions ADD COLUMN question_text_es TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='option_a_es') THEN
    ALTER TABLE public.questions ADD COLUMN option_a_es TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='option_b_es') THEN
    ALTER TABLE public.questions ADD COLUMN option_b_es TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='option_c_es') THEN
    ALTER TABLE public.questions ADD COLUMN option_c_es TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='option_d_es') THEN
    ALTER TABLE public.questions ADD COLUMN option_d_es TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='explanation_es') THEN
    ALTER TABLE public.questions ADD COLUMN explanation_es TEXT;
  END IF;
END
$$;
