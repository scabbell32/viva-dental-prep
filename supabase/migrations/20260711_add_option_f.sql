-- Migration: Add option_f and option_f_es to public.questions, and update constraint for correct_option to allow 'f'
-- Run this in the Supabase SQL editor.

-- 1. Add option_f and option_f_es columns if they don't exist
alter table public.questions
  add column if not exists option_f text,
  add column if not exists option_f_es text;

-- 2. Drop the old constraint
alter table public.questions
  drop constraint if exists questions_correct_option_check;

-- 3. Add the new constraint allowing 'a', 'b', 'c', 'd', 'e', 'f'
alter table public.questions
  add constraint questions_correct_option_check
  check (correct_option in ('a', 'b', 'c', 'd', 'e', 'f'));
