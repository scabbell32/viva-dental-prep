-- Migration: Add Spanish translation columns to the case_sets table
-- Run this in the Supabase SQL editor.

ALTER TABLE public.case_sets 
  ADD COLUMN IF NOT EXISTS case_label_es TEXT,
  ADD COLUMN IF NOT EXISTS description_es TEXT;
