ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS translation_reveals INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.quiz_attempts.translation_reveals IS
  'Count of questions where the candidate revealed a translation before answering.';

ALTER TABLE public.vocab_sets
  ADD COLUMN IF NOT EXISTS chapter_tag TEXT;

CREATE INDEX IF NOT EXISTS vocab_sets_chapter_tag_idx ON public.vocab_sets (chapter_tag);
