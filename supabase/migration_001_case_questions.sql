-- Migration 001: Case Questions Support
-- Run this in the Supabase SQL editor.
-- Safe to run on an existing database — all changes are additive or widen constraints.

-- ─────────────────────────────────────────────
-- TABLE: case_sets
-- Holds the shared context for a group of related questions.
-- Three types:
--   patient  → structured patient chart (JSON) + scenario paragraph (Ch 21 style)
--   figure   → one or more images (Ch 6 style, "Use Fig 6.45 to answer Q6 and Q7")
--   text     → paragraph or passage only, no image
-- ─────────────────────────────────────────────
create table public.case_sets (
  id           uuid    primary key default gen_random_uuid(),
  chapter_tag  text    not null,
  week_number  int     references public.program_weeks(week_number),
  track        text    not null default 'nbdhe'
                       check (track in ('nbdhe', 'jurisprudence')),
  case_label   text    not null,   -- e.g. "Case A", "Fig. 6.45", "Case B"
  case_type    text    not null
                       check (case_type in ('patient', 'figure', 'text')),
  -- patient type: structured table rows as JSON
  -- e.g. {"age":"45","sex":"Male","bp":"122/77","chief_complaint":"No complaint",...}
  patient_data jsonb,
  -- scenario paragraph, case passage, or any supporting text
  description  text,
  is_active    boolean not null default true,
  created_at   timestamptz default now()
);

alter table public.case_sets enable row level security;

create policy "Authenticated users can read active case sets"
  on public.case_sets for select
  using (auth.uid() is not null and is_active = true);

create policy "Admin can manage case sets"
  on public.case_sets for all
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));

-- ─────────────────────────────────────────────
-- TABLE: case_images
-- One row per image belonging to a case set.
-- A figure case may have multiple images (swipeable on mobile).
-- ─────────────────────────────────────────────
create table public.case_images (
  id           uuid primary key default gen_random_uuid(),
  case_set_id  uuid not null references public.case_sets(id) on delete cascade,
  image_url    text not null,      -- Supabase Storage public URL
  storage_path text,               -- bucket path for deletion management
  caption      text,               -- e.g. "Fig. 6.45 — Maxillary occlusal radiograph"
  display_order int not null default 1,
  created_at   timestamptz default now()
);

alter table public.case_images enable row level security;

create policy "Authenticated users can read case images"
  on public.case_images for select
  using (auth.uid() is not null);

create policy "Admin can manage case images"
  on public.case_images for all
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));

-- ─────────────────────────────────────────────
-- ALTER TABLE: questions
-- ─────────────────────────────────────────────

-- Rename existing case_study_id to case_set_id and add FK constraint
alter table public.questions
  rename column case_study_id to case_set_id;

-- Clear any stale UUIDs that were in case_study_id before this migration
-- (those referenced no real table and would violate the FK constraint below)
update public.questions set case_set_id = null where case_set_id is not null;

alter table public.questions
  add constraint questions_case_set_id_fkey
  foreign key (case_set_id) references public.case_sets(id);

-- Question type and position within a case
alter table public.questions
  add column if not exists question_type text not null default 'standalone'
    check (question_type in ('standalone', 'case')),
  add column if not exists sequence_order int; -- ordering within a case group, null for standalone

-- 5th answer option (Ch 21 and similar chapters with 5 choices)
alter table public.questions
  add column if not exists option_e    text,
  add column if not exists option_e_es text;

-- Option order locking
-- default true: preserve original a/b/c/d/e order (safe for case questions and
--               questions where answer sequence has meaning)
-- set to false for standalone chapters (e.g. Ch 8) where shuffling is safe
alter table public.questions
  add column if not exists lock_option_order boolean not null default true;

-- Allow fewer than 4 options (a few questions have 2-3 choices)
alter table public.questions
  alter column option_c drop not null,
  alter column option_d drop not null;

-- Widen correct_option constraint to allow 'e'
alter table public.questions
  drop constraint if exists questions_correct_option_check;
alter table public.questions
  add constraint questions_correct_option_check
  check (correct_option in ('a', 'b', 'c', 'd', 'e'));

-- ─────────────────────────────────────────────
-- INDEX: fast lookup of questions by case set
-- ─────────────────────────────────────────────
create index if not exists idx_questions_case_set_id
  on public.questions(case_set_id)
  where case_set_id is not null;

create index if not exists idx_questions_chapter_type
  on public.questions(chapter_tag, question_type, is_active);
