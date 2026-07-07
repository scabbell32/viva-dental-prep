CREATE TABLE IF NOT EXISTS public.activity_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('vocab', 'listening')),
  week_number INT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, activity_type, week_number)
);

ALTER TABLE public.activity_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can read own completions"
  ON public.activity_completions FOR SELECT
  USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates can insert own completions"
  ON public.activity_completions FOR INSERT
  WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "Admin can read all completions"
  ON public.activity_completions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
