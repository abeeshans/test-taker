-- Check folder_id for the tests
SELECT id, title, folder_id, user_id FROM public.tests LIMIT 5;

-- Check if the folders they belong to actually exist
SELECT t.title, t.folder_id, f.name as folder_name 
FROM public.tests t 
LEFT JOIN public.folders f ON t.folder_id = f.id
WHERE t.folder_id IS NOT NULL;
