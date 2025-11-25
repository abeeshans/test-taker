-- Add details column to test_attempts table to store question-level results
alter table public.test_attempts add column details jsonb;
