-- Viva Dental Prep — Supabase Schema
-- Run this in the Supabase SQL editor to initialize the database.

-- ─────────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('candidate', 'admin')),
  english_level text check (english_level in ('beginner', 'intermediate', 'advanced')),
  country text,
  phone text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admin can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin can update all profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin can insert profiles"
  on public.profiles for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'candidate')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- PROGRAM WEEKS
-- ─────────────────────────────────────────────
create table public.program_weeks (
  id serial primary key,
  week_number int not null unique check (week_number between 1 and 20),
  start_date date not null,
  chapter_tags text[] not null default '{}',
  title text not null,
  phase text not null check (phase in ('written', 'clinical'))
);

alter table public.program_weeks enable row level security;
create policy "Anyone authenticated can read weeks"
  on public.program_weeks for select using (auth.uid() is not null);
create policy "Admin can manage weeks"
  on public.program_weeks for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─────────────────────────────────────────────
-- QUESTIONS
-- ─────────────────────────────────────────────
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  track text not null check (track in ('nbdhe', 'jurisprudence')),
  week_number int references public.program_weeks(week_number),
  chapter_tag text,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('a','b','c','d')),
  explanation text,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')) default 'medium',
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.questions enable row level security;
create policy "Authenticated users can read active questions"
  on public.questions for select
  using (auth.uid() is not null and is_active = true);
create policy "Admin can manage questions"
  on public.questions for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─────────────────────────────────────────────
-- QUIZ ATTEMPTS
-- ─────────────────────────────────────────────
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.profiles(id) on delete cascade not null,
  track text not null check (track in ('nbdhe', 'jurisprudence')),
  week_number int not null,
  score int not null check (score between 0 and 10),
  total_questions int not null default 10,
  answers jsonb not null default '[]',
  completed_at timestamptz default now()
);

alter table public.quiz_attempts enable row level security;
create policy "Candidates can read own attempts"
  on public.quiz_attempts for select using (auth.uid() = candidate_id);
create policy "Candidates can insert own attempts"
  on public.quiz_attempts for insert with check (auth.uid() = candidate_id);
create policy "Admin can read all attempts"
  on public.quiz_attempts for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─────────────────────────────────────────────
-- VOCABULARY SETS
-- ─────────────────────────────────────────────
create table public.vocab_sets (
  id uuid primary key default gen_random_uuid(),
  week_number int references public.program_weeks(week_number) not null,
  spanish_term text not null,
  english_term text not null,
  pronunciation_tip text,
  category text,
  created_at timestamptz default now()
);

alter table public.vocab_sets enable row level security;
create policy "Authenticated users can read vocab"
  on public.vocab_sets for select using (auth.uid() is not null);
create policy "Admin can manage vocab"
  on public.vocab_sets for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─────────────────────────────────────────────
-- LISTENING EXERCISES
-- ─────────────────────────────────────────────
create table public.listening_exercises (
  id uuid primary key default gen_random_uuid(),
  week_number int references public.program_weeks(week_number) not null,
  title text not null,
  dialogue_text text not null,
  cloze_text text not null,
  cloze_answers jsonb not null default '[]',
  comprehension_questions jsonb not null default '[]',
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.listening_exercises enable row level security;
create policy "Authenticated users can read active exercises"
  on public.listening_exercises for select
  using (auth.uid() is not null and is_active = true);
create policy "Admin can manage exercises"
  on public.listening_exercises for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─────────────────────────────────────────────
-- ADMIN NOTES
-- ─────────────────────────────────────────────
create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.profiles(id) on delete cascade not null,
  note_text text not null,
  created_by uuid references public.profiles(id) not null,
  created_at timestamptz default now()
);

alter table public.admin_notes enable row level security;
create policy "Candidates can read own notes"
  on public.admin_notes for select using (auth.uid() = candidate_id);
create policy "Admin can manage all notes"
  on public.admin_notes for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─────────────────────────────────────────────
-- READINESS SCORE VIEW
-- Rolling 7-day weighted average per candidate per track
-- ─────────────────────────────────────────────
create or replace view public.readiness_scores as
select
  candidate_id,
  track,
  round(
    sum(score::numeric / total_questions * 100 * weight) / sum(weight),
    1
  ) as score_pct,
  count(*) as attempts_in_window
from (
  select
    candidate_id,
    track,
    score,
    total_questions,
    completed_at,
    -- Weight: most recent day = 7, oldest = 1
    7 - extract(day from (now() - completed_at))::int as weight
  from public.quiz_attempts
  where completed_at >= now() - interval '7 days'
) weighted
where weight > 0
group by candidate_id, track;

-- ─────────────────────────────────────────────
-- SEED: PROGRAM WEEKS (20 weeks from June 30)
-- ─────────────────────────────────────────────
insert into public.program_weeks (week_number, start_date, title, chapter_tags, phase) values
(1,  '2026-06-30', 'Board Intro, Histology & Anatomy',         array['ch1','ch2','ch3'],  'written'),
(2,  '2026-07-07', 'Head & Neck, Dental Anatomy',              array['ch4','ch5'],        'written'),
(3,  '2026-07-14', 'Oral Radiology',                           array['ch6'],              'written'),
(4,  '2026-07-21', 'General & Oral Pathology',                 array['ch7','ch8'],        'written'),
(5,  '2026-07-28', 'Microbiology & Infection Control',         array['ch9','ch10'],       'written'),
(6,  '2026-08-04', 'Pharmacology',                             array['ch11'],             'written'),
(7,  '2026-08-11', 'Biochemistry, Nutrition & Biomaterials',   array['ch12','ch13'],      'written'),
(8,  '2026-08-18', 'Periodontics & Instrumentation',           array['ch14','ch17'],      'written'),
(9,  '2026-08-25', 'Process of Care & Prevention',             array['ch15','ch16'],      'written'),
(10, '2026-09-01', 'Pain Management & Medical Emergencies',    array['ch18','ch21'],      'written'),
(11, '2026-09-08', 'Special Needs & Community Health',         array['ch19','ch20'],      'written'),
(12, '2026-09-15', 'Ethics, Jurisprudence & Mock Exam #1',     array['ch22'],             'written'),
(13, '2026-09-22', 'Board Post-Mortem & Jurisprudence Prep',   array['jurisprudence'],    'written'),
(14, '2026-09-29', 'ADEX SimoDH Rubric & Registration',        array['adex'],             'clinical'),
(15, '2026-10-06', 'Calculus Detection — Maxillary Arch',      array['adex'],             'clinical'),
(16, '2026-10-13', 'Calculus Removal — Mandibular Arch',       array['adex'],             'clinical'),
(17, '2026-10-20', 'Ergonomics & Tissue Trauma Prevention',    array['adex'],             'clinical'),
(18, '2026-10-27', 'ADEX Mock Board Exam #1',                  array['adex'],             'clinical'),
(19, '2026-11-03', 'ADEX Mock Board Exam #2 & Jurisprudence',  array['adex','jurisprudence'], 'clinical'),
(20, '2026-11-10', 'Final Dress Rehearsal',                    array['adex'],             'clinical');
