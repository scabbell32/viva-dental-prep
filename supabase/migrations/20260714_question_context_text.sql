-- Migration: add a per-question free-text context panel (e.g. a text-only case
-- scenario) that displays alongside or instead of images.
-- Run this in the Supabase SQL editor.

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS context_text text;
