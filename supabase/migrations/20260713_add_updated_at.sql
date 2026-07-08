-- Migration: Add updated_at column to questions table to track edits and enable sorting by recently edited.
-- Run this in the Supabase SQL editor or apply via Supabase CLI.

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create or update the trigger function to handle updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop the trigger if it already exists, then create it
DROP TRIGGER IF EXISTS update_questions_updated_at ON public.questions;

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
