-- Add source_id column to tests table to track original ID of imported tests
alter table public.tests add column source_id uuid;
