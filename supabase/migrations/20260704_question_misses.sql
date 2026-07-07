-- Denormalized table: one row per question per attempt, for fast miss analytics
create table if not exists public.question_results (
  id            uuid primary key default gen_random_uuid(),
  attempt_id    uuid references public.quiz_attempts(id) on delete cascade,
  candidate_id  uuid references auth.users(id) on delete cascade not null,
  question_id   uuid references public.questions(id) on delete cascade not null,
  selected_option text not null,
  correct_option  text not null,
  is_correct    boolean not null,
  answered_at   timestamptz not null default now()
);

create index if not exists idx_question_results_candidate on public.question_results(candidate_id);
create index if not exists idx_question_results_question  on public.question_results(question_id);
create index if not exists idx_question_results_incorrect on public.question_results(question_id) where is_correct = false;

-- View: miss count per question (for admin dashboard)
create or replace view public.question_miss_summary as
  select
    q.id as question_id,
    q.question_text,
    q.chapter_tag,
    q.week_number,
    q.track,
    count(*) filter (where qr.is_correct = false) as miss_count,
    count(*) as attempt_count,
    round(100.0 * count(*) filter (where qr.is_correct = false) / nullif(count(*),0), 1) as miss_pct
  from public.questions q
  left join public.question_results qr on qr.question_id = q.id
  group by q.id, q.question_text, q.chapter_tag, q.week_number, q.track
  order by miss_count desc;

-- View: per-candidate question misses
create or replace view public.candidate_missed_questions as
  select
    p.full_name,
    u.email,
    q.question_text,
    q.chapter_tag,
    q.week_number,
    count(*) as times_missed,
    max(qr.answered_at) as last_missed_at
  from public.question_results qr
  join public.profiles p on p.id = qr.candidate_id
  join auth.users u on u.id = qr.candidate_id
  join public.questions q on q.id = qr.question_id
  where qr.is_correct = false
  group by p.full_name, u.email, q.question_text, q.chapter_tag, q.week_number
  order by p.full_name, times_missed desc;
