-- Drop the existing constraint (assuming standard naming or previous creation)
ALTER TABLE public.tests DROP CONSTRAINT IF EXISTS tests_folder_id_fkey;

-- Re-add the constraint with ON DELETE CASCADE
ALTER TABLE public.tests
ADD CONSTRAINT tests_folder_id_fkey
FOREIGN KEY (folder_id)
REFERENCES public.folders(id)
ON DELETE CASCADE;
