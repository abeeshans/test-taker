-- Add UPDATE policy for test_attempts
DROP POLICY IF EXISTS "Users can update their own test attempts" ON public.test_attempts;
CREATE POLICY "Users can update their own test attempts" ON public.test_attempts FOR UPDATE USING (auth.uid() = user_id);

-- Add DELETE policy for test_attempts (good practice to have)
DROP POLICY IF EXISTS "Users can delete their own test attempts" ON public.test_attempts;
CREATE POLICY "Users can delete their own test attempts" ON public.test_attempts FOR DELETE USING (auth.uid() = user_id);
