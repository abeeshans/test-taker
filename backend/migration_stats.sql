-- Add columns for test statistics
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS question_count integer DEFAULT 0;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS set_count integer DEFAULT 0;
