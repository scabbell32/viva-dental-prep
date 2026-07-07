-- Admin-curated daily quiz sets
CREATE TABLE IF NOT EXISTS public.daily_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  week_number int NOT NULL,
  question_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.daily_quizzes ENABLE ROW LEVEL SECURITY;

-- Only admins can read or write
CREATE POLICY "Admin manage daily quizzes" ON public.daily_quizzes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
