-- Migration 001 (final): Case Questions Support
-- Single self-contained script. Safe to run from scratch.
-- Uses IF NOT EXISTS / DO blocks throughout so it can also resume from any partial state.

-- ─────────────────────────────────────────────
-- TABLE: case_sets
-- ─────────────────────────────────────────────
create table if not exists public.case_sets (
  id           uuid        primary key default gen_random_uuid(),
  chapter_tag  text        not null,
  week_number  int         references public.program_weeks(week_number),
  track        text        not null default 'nbdhe'
                           check (track in ('nbdhe', 'jurisprudence')),
  case_label   text        not null,
  case_type    text        not null
                           check (case_type in ('patient', 'figure', 'text')),
  patient_data jsonb,
  description  text,
  is_active    boolean     not null default true,
  created_at   timestamptz default now()
);

alter table public.case_sets enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'case_sets'
      and policyname = 'Authenticated users can read active case sets'
  ) then
    create policy "Authenticated users can read active case sets"
      on public.case_sets for select
      using (auth.uid() is not null and is_active = true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'case_sets'
      and policyname = 'Admin can manage case sets'
  ) then
    create policy "Admin can manage case sets"
      on public.case_sets for all
      using (exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      ));
  end if;
end $$;

-- ─────────────────────────────────────────────
-- TABLE: case_images
-- ─────────────────────────────────────────────
create table if not exists public.case_images (
  id            uuid        primary key default gen_random_uuid(),
  case_set_id   uuid        not null references public.case_sets(id) on delete cascade,
  image_url     text        not null,
  storage_path  text,
  caption       text,
  display_order int         not null default 1,
  created_at    timestamptz default now()
);

alter table public.case_images enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'case_images'
      and policyname = 'Authenticated users can read case images'
  ) then
    create policy "Authenticated users can read case images"
      on public.case_images for select
      using (auth.uid() is not null);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'case_images'
      and policyname = 'Admin can manage case images'
  ) then
    create policy "Admin can manage case images"
      on public.case_images for all
      using (exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      ));
  end if;
end $$;

-- ─────────────────────────────────────────────
-- ALTER TABLE: questions
-- ─────────────────────────────────────────────

-- Rename case_study_id → case_set_id if the old name still exists
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'questions'
      and column_name  = 'case_study_id'
  ) then
    alter table public.questions rename column case_study_id to case_set_id;
  end if;
end $$;

-- Clear any stale UUIDs before adding FK
update public.questions set case_set_id = null where case_set_id is not null;

-- FK constraint
do $$ begin
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

-- New columns (all use IF NOT EXISTS)
alter table public.questions
  add column if not exists question_type     text    not null default 'standalone'
                                             check (question_type in ('standalone', 'case')),
  add column if not exists sequence_order    int,
  add column if not exists option_e          text,
  add column if not exists option_e_es       text,
  add column if not exists lock_option_order boolean not null default true;

-- Allow fewer than 4 options
alter table public.questions
  alter column option_c drop not null,
  alter column option_d drop not null;

-- Widen correct_option to allow 'e'
alter table public.questions
  drop constraint if exists questions_correct_option_check;
alter table public.questions
  add constraint questions_correct_option_check
  check (correct_option in ('a', 'b', 'c', 'd', 'e'));

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
create index if not exists idx_questions_case_set_id
  on public.questions(case_set_id)
  where case_set_id is not null;

create index if not exists idx_questions_chapter_type
  on public.questions(chapter_tag, question_type, is_active);
