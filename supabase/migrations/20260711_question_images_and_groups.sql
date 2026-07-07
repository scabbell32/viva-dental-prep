-- Migration: Support multiple images per question and client-side uploads via Supabase Storage
-- Run this in the Supabase SQL editor.

-- 1. Add image_urls column to public.questions table if it doesn't exist
alter table public.questions 
  add column if not exists image_urls text[] not null default '{}';

-- 2. Migrate existing image_url values to the image_urls array
update public.questions
set image_urls = array[image_url]
where image_url is not null 
  and (image_urls is null or array_length(image_urls, 1) is null);

-- 3. Create the 'question-images' storage bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;

-- 4. Create policy to allow anyone to view images (public read access) (RLS is enabled on storage.objects by default)
drop policy if exists "Allow public read access to question-images" on storage.objects;
create policy "Allow public read access to question-images"
  on storage.objects for select
  using (bucket_id = 'question-images');

-- 6. Create policy to allow administrators to perform all actions (upload, delete, update)
drop policy if exists "Allow admin to manage question-images" on storage.objects;
create policy "Allow admin to manage question-images"
  on storage.objects for all
  using (
    bucket_id = 'question-images'
    and (exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    ))
  );

-- 7. Drop the old constraint left over from case_study_id column rename
alter table public.questions drop constraint if exists questions_case_study_id_fkey;
