-- Migration 001b: Complete case questions setup
-- Run this in the Supabase SQL editor.
-- Handles the state where case_sets and case_images tables already exist
-- but the questions table changes have not yet been applied.

-- Rename case_study_id → case_set_id only if the old name still exists
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'questions'
      and column_name  = 'case_study_id'
  ) then
    alter table public.questions rename column case_study_id to case_set_id;
  end if;
end $$;

-- Clear stale UUIDs (they referenced no real table)
update public.questions set case_set_id = null where case_set_id is not null;

-- FK to case_sets (skip if already exists)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema    = 'public'
      and table_name      = 'questions'
      and constraint_name = 'questions_case_set_id_fkey'
  ) then
    alter table public.questions
      add constraint questions_case_set_id_fkey
      foreign key (case_set_id) references public.case_sets(id);
  end if;
end $$;

-- Question type and position within a case
alter table public.questions
  add column if not exists question_type text not null default 'standalone'
    check (question_type in ('standalone', 'case')),
  add column if not exists sequence_order int;

-- 5th answer option
alter table public.questions
  add column if not exists option_e    text,
  add column if not exists option_e_es text;

-- Option order locking (default true = preserve original order)
alter table public.questions
  add column if not exists lock_option_order boolean not null default true;

-- Allow fewer than 4 options
alter table public.questions
  alter column option_c drop not null,
  alter column option_d drop not null;

-- Widen correct_option constraint to allow 'e'
alter table public.questions
  drop constraint if exists questions_correct_option_check;
alter table public.questions
  add constraint questions_correct_option_check
  check (correct_option in ('a', 'b', 'c', 'd', 'e'));

-- Indexes
create index if not exists idx_questions_case_set_id
  on public.questions(case_set_id)
  where case_set_id is not null;

create index if not exists idx_questions_chapter_type
  on public.questions(chapter_tag, question_type, is_active);
