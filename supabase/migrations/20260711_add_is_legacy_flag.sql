-- Migration: Add is_legacy column to distinguish new/vetted questions from old imported ones
-- Run this in the Supabase SQL editor.

-- 1. Add is_legacy column to public.questions table if it doesn't exist
alter table public.questions 
  add column if not exists is_legacy boolean not null default false;

-- 2. Mark all existing questions as legacy
update public.questions
set is_legacy = true;
