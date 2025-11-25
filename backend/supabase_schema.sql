-- Create tests table
create table public.tests (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null,
  content jsonb not null,
  created_at timestamp with time zone not null default now(),
  constraint tests_pkey primary key (id),
  constraint tests_user_id_fkey foreign key (user_id) references auth.users (id)
);

-- Enable RLS
alter table public.tests enable row level security;

-- Create policies
create policy "Users can view their own tests" on public.tests
  for select using (auth.uid() = user_id);

create policy "Users can insert their own tests" on public.tests
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own tests" on public.tests
  for update using (auth.uid() = user_id);

create policy "Users can delete their own tests" on public.tests
  for delete using (auth.uid() = user_id);

-- Storage policies (assuming 'pdfs' bucket exists)
-- You need to create the 'pdfs' bucket in the Supabase Dashboard first!

-- Policy for viewing PDFs
-- create policy "Users can view their own PDFs" on storage.objects
--   for select using (bucket_id = 'pdfs' and auth.uid() = owner);

-- Policy for uploading PDFs
-- create policy "Users can upload PDFs" on storage.objects
--   for insert with check (bucket_id = 'pdfs' and auth.uid() = owner);

-- --- Phase 2 Updates ---

-- Create folders table
create table public.folders (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  parent_id uuid, -- For nested folders (optional)
  created_at timestamp with time zone not null default now(),
  constraint folders_pkey primary key (id),
  constraint folders_user_id_fkey foreign key (user_id) references auth.users (id),
  constraint folders_parent_id_fkey foreign key (parent_id) references public.folders (id) on delete cascade
);

-- Enable RLS for folders
alter table public.folders enable row level security;

create policy "Users can view their own folders" on public.folders
  for select using (auth.uid() = user_id);

create policy "Users can insert their own folders" on public.folders
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own folders" on public.folders
  for update using (auth.uid() = user_id);

create policy "Users can delete their own folders" on public.folders
  for delete using (auth.uid() = user_id);

-- Update tests table
alter table public.tests add column folder_id uuid references public.folders(id) on delete set null;
alter table public.tests add column is_starred boolean not null default false;
alter table public.tests add column last_accessed timestamp with time zone;

-- Create test_attempts table (for statistics)
create table public.test_attempts (
  id uuid not null default gen_random_uuid(),
  test_id uuid not null,
  user_id uuid not null default auth.uid(),
  score integer not null,
  total_questions integer not null,
  time_taken integer not null, -- in seconds
  completed_at timestamp with time zone not null default now(),
  constraint test_attempts_pkey primary key (id),
  constraint test_attempts_test_id_fkey foreign key (test_id) references public.tests (id) on delete cascade,
  constraint test_attempts_user_id_fkey foreign key (user_id) references auth.users (id)
);

-- Enable RLS for test_attempts
alter table public.test_attempts enable row level security;

create policy "Users can view their own test attempts" on public.test_attempts
  for select using (auth.uid() = user_id);

create policy "Users can insert their own test attempts" on public.test_attempts
  for insert with check (auth.uid() = user_id);

