-- Study stack: questions a candidate flags during the Spanish break for deeper review.
-- teaching_script is generated async by Claude after the item is created.
CREATE TABLE IF NOT EXISTS public.study_stack_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id     uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  teaching_script text,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'ready', 'error')),
  created_at      timestamptz DEFAULT now(),
  UNIQUE (candidate_id, question_id)
);

ALTER TABLE public.study_stack_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates manage own stack"
  ON public.study_stack_items FOR ALL
  USING (auth.uid() = candidate_id)
  WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "Admin read all stack items"
  ON public.study_stack_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
