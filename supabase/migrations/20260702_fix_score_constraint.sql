-- The original schema had CHECK (score between 0 and 10) but the quiz now
-- delivers 15 questions, so scores of 11-15 were failing the constraint.
ALTER TABLE public.quiz_attempts
  DROP CONSTRAINT IF EXISTS quiz_attempts_score_check;

ALTER TABLE public.quiz_attempts
  ADD CONSTRAINT quiz_attempts_score_check CHECK (score >= 0 AND score <= total_questions);
