-- Migration: Add duration_seconds column to quiz_attempts to track time spent on quizzes.

ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS duration_seconds integer;
