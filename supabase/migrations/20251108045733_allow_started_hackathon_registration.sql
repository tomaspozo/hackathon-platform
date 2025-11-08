-- Migration: allow_started_hackathon_registration
-- Purpose: Allow participants to register for hackathons with OPEN or STARTED status
-- 
-- Changes:
-- - Update can_register() function to allow registration for OPEN or STARTED hackathons
-- - Update hackathon_participants insert policy to allow registration for OPEN or STARTED hackathons

-- Update can_register function to allow registration for OPEN or STARTED hackathons
create or replace function public.can_register(target_hackathon_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select status in ('OPEN'::public.hackathon_status, 'STARTED'::public.hackathon_status)
  from public.hackathons
  where id = target_hackathon_id;
$$;

-- Drop existing policy
drop policy if exists "participants insertable by self" on public.hackathon_participants;

-- Recreate policy to allow registration for OPEN or STARTED hackathons
create policy "participants insertable by self" on public.hackathon_participants
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.hackathons
      where id = hackathon_id
        and status in ('OPEN'::public.hackathon_status, 'STARTED'::public.hackathon_status)
    )
  );

