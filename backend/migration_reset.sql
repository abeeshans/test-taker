-- Add is_reset column to test_attempts if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_attempts' AND column_name = 'is_reset') THEN
        ALTER TABLE public.test_attempts ADD COLUMN is_reset boolean NOT NULL DEFAULT false;
    END IF;
END $$;
