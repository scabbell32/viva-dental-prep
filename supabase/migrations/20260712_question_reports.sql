-- Migration: candidate-reported problems with questions (OCR garble, wrong answer, etc.)
-- Run this in the Supabase SQL editor.

create table if not exists public.question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.questions(id) on delete cascade not null,
  candidate_id uuid references public.profiles(id) on delete set null,
  reason text,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz default now()
);

create index if not exists question_reports_question_id_idx on public.question_reports (question_id);
create index if not exists question_reports_status_idx on public.question_reports (status);

alter table public.question_reports enable row level security;

-- Candidates can file a report for themselves
create policy "Candidates can insert own reports"
  on public.question_reports for insert
  with check (auth.uid() = candidate_id);

-- Candidates can read their own reports (so the UI can confirm)
create policy "Candidates can read own reports"
  on public.question_reports for select
  using (auth.uid() = candidate_id);

-- Admin can read and manage all reports
create policy "Admin can manage all reports"
  on public.question_reports for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
