-- Add exam_date to profiles so candidates can set their NBDHE test date
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS exam_date date;
