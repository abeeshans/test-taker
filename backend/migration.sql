-- Safely create folders table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.folders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  parent_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT folders_pkey PRIMARY KEY (id),
  CONSTRAINT folders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id),
  CONSTRAINT folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.folders (id) ON DELETE CASCADE
);

-- Enable RLS for folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- Safely create policies for folders (drop first to ensure update)
DROP POLICY IF EXISTS "Users can view their own folders" ON public.folders;
CREATE POLICY "Users can view their own folders" ON public.folders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own folders" ON public.folders;
CREATE POLICY "Users can insert their own folders" ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own folders" ON public.folders;
CREATE POLICY "Users can update their own folders" ON public.folders FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own folders" ON public.folders;
CREATE POLICY "Users can delete their own folders" ON public.folders FOR DELETE USING (auth.uid() = user_id);


-- Update tests table with new columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tests' AND column_name = 'folder_id') THEN
        ALTER TABLE public.tests ADD COLUMN folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tests' AND column_name = 'is_starred') THEN
        ALTER TABLE public.tests ADD COLUMN is_starred boolean NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tests' AND column_name = 'last_accessed') THEN
        ALTER TABLE public.tests ADD COLUMN last_accessed timestamp with time zone;
    END IF;
END $$;


-- Safely create test_attempts table
CREATE TABLE IF NOT EXISTS public.test_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  score integer NOT NULL,
  total_questions integer NOT NULL,
  time_taken integer NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT test_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT test_attempts_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests (id) ON DELETE CASCADE,
  CONSTRAINT test_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id)
);

-- Enable RLS for test_attempts
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

-- Safely create policies for test_attempts
DROP POLICY IF EXISTS "Users can view their own test attempts" ON public.test_attempts;
CREATE POLICY "Users can view their own test attempts" ON public.test_attempts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own test attempts" ON public.test_attempts;
CREATE POLICY "Users can insert their own test attempts" ON public.test_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
