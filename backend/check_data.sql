-- Check count of tests and folders for all users
SELECT 
    (SELECT count(*) FROM public.tests) as total_tests,
    (SELECT count(*) FROM public.folders) as total_folders,
    (SELECT count(*) FROM auth.users) as total_users;

-- Check if there are any tests for the current user (you can see user_ids in the output)
SELECT id, title, user_id FROM public.tests LIMIT 5;
