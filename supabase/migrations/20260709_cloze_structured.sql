-- Structured cloze column: { text: "..{0}..{1}..", blanks: [{index,answer,accept:[]}] }
-- Old cloze_text + cloze_answers columns remain until the UI is fully switched and
-- all rows are backfilled, then dropped in a follow-up migration.
ALTER TABLE public.listening_exercises
  ADD COLUMN IF NOT EXISTS cloze JSONB;
