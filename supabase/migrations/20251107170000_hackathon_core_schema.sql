-- migration: hackathon_core_schema
-- purpose: define roles and core hackathon entities including categories and judging criteria.

-- create the user_role enum to capture platform-level access roles.
do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'user_role'
      and pg_type.typnamespace = (
        select oid
        from pg_namespace
        where nspname = 'public'
      )
  ) then
    create type public.user_role as enum ('admin', 'participant', 'judge');
  end if;
end $$;

-- extend the profiles table to include role assignments and optional metadata.
alter table public.profiles
  add column if not exists role public.user_role not null default 'participant';

alter table public.profiles
  add column if not exists organization text;

alter table public.profiles
  add column if not exists title text;

comment on column public.profiles.role is 'Defines the platform role for this user (admin, participant, judge).';
comment on column public.profiles.organization is 'Optional organization or affiliation metadata for admins and judges.';
comment on column public.profiles.title is 'Optional title or role description for admins and judges.';

update public.profiles
set role = coalesce(role, 'participant'::public.user_role)
where role is null;

-- create a reusable trigger function to keep updated_at timestamps in sync.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- hackathons table captures scheduling and activation data.
create table if not exists public.hackathons (
  id uuid default gen_random_uuid() primary key,
  slug text not null,
  name text not null,
  description text,
  start_at timestamp with time zone not null,
  end_at timestamp with time zone not null,
  registration_open_at timestamp with time zone,
  registration_close_at timestamp with time zone,
  is_active boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint hackathons_slug_unique unique (slug),
  constraint hackathons_time_window check (start_at < end_at),
  constraint hackathons_registration_window check (
    registration_open_at is null
    or registration_close_at is null
    or registration_open_at <= registration_close_at
  )
);

comment on table public.hackathons is 'Defines each hackathon event, including schedule, registration window, and activation state.';
comment on column public.hackathons.slug is 'URL-friendly identifier for routing and API access.';
comment on column public.hackathons.is_active is 'Marks the hackathon that is currently live on the platform.';

create unique index if not exists hackathons_single_active_unique
  on public.hackathons (is_active)
  where is_active;

create trigger hackathons_set_updated_at
  before update on public.hackathons
  for each row
  execute function public.touch_updated_at();

-- categories scoped to a hackathon for project submissions.
create table if not exists public.hackathon_categories (
  id uuid default gen_random_uuid() primary key,
  hackathon_id uuid not null references public.hackathons (id) on delete cascade,
  name text not null,
  description text,
  display_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint hackathon_categories_unique_name unique (hackathon_id, name)
);

comment on table public.hackathon_categories is 'Category labels participants can submit under for a given hackathon.';

create index if not exists hackathon_categories_hackathon_id_idx
  on public.hackathon_categories (hackathon_id);

create trigger hackathon_categories_set_updated_at
  before update on public.hackathon_categories
  for each row
  execute function public.touch_updated_at();

-- judging criteria with weight assignments per hackathon.
create table if not exists public.judging_criteria (
  id uuid default gen_random_uuid() primary key,
  hackathon_id uuid not null references public.hackathons (id) on delete cascade,
  name text not null,
  description text,
  weight numeric(5, 2) not null,
  display_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint judging_criteria_unique_name unique (hackathon_id, name),
  constraint judging_criteria_weight_positive check (weight > 0)
);

comment on table public.judging_criteria is 'Weighted scoring criteria used by judges for a given hackathon.';
comment on column public.judging_criteria.weight is 'Weight percentage (0-100) contributing to the total score.';

create index if not exists judging_criteria_hackathon_id_idx
  on public.judging_criteria (hackathon_id);

create trigger judging_criteria_set_updated_at
  before update on public.judging_criteria
  for each row
  execute function public.touch_updated_at();

-- ensure judging criteria weights sum to 100 per hackathon.
create or replace function public.enforce_judging_criteria_weight_total()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_hackathon_id uuid;
  total_weight numeric(7, 2);
begin
  target_hackathon_id := coalesce(new.hackathon_id, old.hackathon_id);

  select coalesce(sum(weight), 0)
  into total_weight
  from public.judging_criteria
  where hackathon_id = target_hackathon_id;

  if total_weight <> 100 then
    raise exception 'Judging criteria weights for hackathon % must sum to 100. Current total: %', target_hackathon_id, total_weight;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create constraint trigger judging_criteria_weight_total_enforced
  after insert or update or delete on public.judging_criteria
  deferrable initially deferred
  for each row
  execute function public.enforce_judging_criteria_weight_total();


-- create submission_status enum to track draft vs submitted states.
do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'submission_status'
      and pg_type.typnamespace = (
        select oid
        from pg_namespace
        where nspname = 'public'
      )
  ) then
    create type public.submission_status as enum ('draft', 'submitted');
  end if;
end $$;

-- teams represent participant groups within a hackathon.
create table if not exists public.teams (
  id uuid default gen_random_uuid() primary key,
  hackathon_id uuid not null references public.hackathons (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint teams_unique_name unique (hackathon_id, name),
  constraint teams_unique_slug unique (hackathon_id, slug)
);

comment on table public.teams is 'Participant teams competing in a hackathon.';
comment on column public.teams.created_by is 'Auth user that initially created the team.';

create index if not exists teams_hackathon_id_idx
  on public.teams (hackathon_id);

create index if not exists teams_created_by_idx
  on public.teams (created_by);

create trigger teams_set_updated_at
  before update on public.teams
  for each row
  execute function public.touch_updated_at();

-- team membership tracks which users belong to which teams.
create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  is_owner boolean not null default false,
  joined_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint team_members_pkey primary key (team_id, user_id)
);

comment on table public.team_members is 'Links users to teams for hackathon participation.';
comment on column public.team_members.is_owner is 'Indicates which member acts as the team captain/owner.';

create index if not exists team_members_user_id_idx
  on public.team_members (user_id);

create unique index if not exists team_members_single_owner_unique
  on public.team_members (team_id)
  where is_owner;

create trigger team_members_set_updated_at
  before update on public.team_members
  for each row
  execute function public.touch_updated_at();

-- project submissions capture deliverables per team and category.
create table if not exists public.project_submissions (
  id uuid default gen_random_uuid() primary key,
  team_id uuid not null references public.teams (id) on delete cascade,
  hackathon_id uuid not null references public.hackathons (id) on delete cascade,
  category_id uuid not null references public.hackathon_categories (id) on delete restrict,
  name text not null,
  repo_url text not null,
  demo_url text,
  summary text,
  status public.submission_status not null default 'draft',
  last_submitted_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint project_submissions_unique_team unique (team_id)
);

comment on table public.project_submissions is 'Stores the latest project submission details for each team.';
comment on column public.project_submissions.status is 'Draft or submitted indicator for the current iteration.';
comment on column public.project_submissions.last_submitted_at is 'Timestamp capturing the last time the submission was formally submitted.';

create index if not exists project_submissions_hackathon_id_idx
  on public.project_submissions (hackathon_id);

create index if not exists project_submissions_category_id_idx
  on public.project_submissions (category_id);

create trigger project_submissions_set_updated_at
  before update on public.project_submissions
  for each row
  execute function public.touch_updated_at();

-- ensure submission hackathon alignment with its team.
create or replace function public.enforce_submission_hackathon_alignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  team_hackathon_id uuid;
begin
  select hackathon_id
  into team_hackathon_id
  from public.teams
  where id = new.team_id;

  if team_hackathon_id is null then
    raise exception 'Team % not found while validating submission hackathon link.', new.team_id;
  end if;

  if new.hackathon_id <> team_hackathon_id then
    raise exception 'Submission hackathon % must match team hackathon %.', new.hackathon_id, team_hackathon_id;
  end if;

  return new;
end;
$$;

create trigger project_submissions_validate_hackathon
  before insert or update on public.project_submissions
  for each row
  execute function public.enforce_submission_hackathon_alignment();


-- judge assignments restrict which judges evaluate which teams.
create table if not exists public.judge_assignments (
  id uuid default gen_random_uuid() primary key,
  hackathon_id uuid not null references public.hackathons (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  judge_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint judge_assignments_unique unique (hackathon_id, team_id, judge_id)
);

comment on table public.judge_assignments is 'Assigns judges to specific teams for scoring within a hackathon.';

create index if not exists judge_assignments_team_id_idx
  on public.judge_assignments (team_id);

create index if not exists judge_assignments_judge_id_idx
  on public.judge_assignments (judge_id);

create trigger judge_assignments_set_updated_at
  before update on public.judge_assignments
  for each row
  execute function public.touch_updated_at();

-- ensure judge assignments align with the team hackathon.
create or replace function public.enforce_judge_assignment_alignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  team_hackathon_id uuid;
begin
  select hackathon_id
  into team_hackathon_id
  from public.teams
  where id = new.team_id;

  if team_hackathon_id is null then
    raise exception 'Team % not found while validating judge assignment.', new.team_id;
  end if;

  if new.hackathon_id <> team_hackathon_id then
    raise exception 'Judge assignments must target teams within the same hackathon.';
  end if;

  return new;
end;
$$;

create trigger judge_assignments_validate_hackathon
  before insert or update on public.judge_assignments
  for each row
  execute function public.enforce_judge_assignment_alignment();

-- judges enter criterion-level scores for each team.
create table if not exists public.judging_scores (
  id uuid default gen_random_uuid() primary key,
  hackathon_id uuid not null references public.hackathons (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  judge_id uuid not null references auth.users (id) on delete cascade,
  criterion_id uuid not null references public.judging_criteria (id) on delete cascade,
  score numeric(5, 2) not null,
  notes text,
  submitted_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint judging_scores_unique_assignment unique (hackathon_id, team_id, judge_id, criterion_id),
  constraint judging_scores_score_range check (score between 0 and 100)
);

comment on table public.judging_scores is 'Stores judge-entered scores for each team against every criterion.';

create index if not exists judging_scores_team_id_idx
  on public.judging_scores (team_id);

create index if not exists judging_scores_judge_id_idx
  on public.judging_scores (judge_id);

create index if not exists judging_scores_criterion_id_idx
  on public.judging_scores (criterion_id);

create trigger judging_scores_set_updated_at
  before update on public.judging_scores
  for each row
  execute function public.touch_updated_at();

-- validate scoring rows align with team, hackathon, and assignments.
create or replace function public.enforce_judging_score_alignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  team_hackathon_id uuid;
  criterion_hackathon_id uuid;
  assignment_exists boolean;
begin
  select hackathon_id
  into team_hackathon_id
  from public.teams
  where id = new.team_id;

  if team_hackathon_id is null then
    raise exception 'Team % not found while validating judging score.', new.team_id;
  end if;

  if new.hackathon_id <> team_hackathon_id then
    raise exception 'Judging scores must reference the same hackathon as the team.';
  end if;

  select hackathon_id
  into criterion_hackathon_id
  from public.judging_criteria
  where id = new.criterion_id;

  if criterion_hackathon_id is null then
    raise exception 'Criterion % not found while validating judging score.', new.criterion_id;
  end if;

  if criterion_hackathon_id <> new.hackathon_id then
    raise exception 'Judging scores must reference criteria from the same hackathon.';
  end if;

  select exists (
    select 1
    from public.judge_assignments
    where hackathon_id = new.hackathon_id
      and team_id = new.team_id
      and judge_id = new.judge_id
  )
  into assignment_exists;

  if not assignment_exists then
    raise exception 'Judge % is not assigned to team % for hackathon %.', new.judge_id, new.team_id, new.hackathon_id;
  end if;

  return new;
end;
$$;

create trigger judging_scores_validate_alignment
  before insert or update on public.judging_scores
  for each row
  execute function public.enforce_judging_score_alignment();

-- expose a scoreboard view aggregating weighted scores per team and category.
create or replace view public.team_scores as
with judge_totals as (
  select
    js.hackathon_id,
    js.team_id,
    js.judge_id,
    sum(js.score * jc.weight / 100) as judge_total
  from public.judging_scores js
  join public.judging_criteria jc on jc.id = js.criterion_id
  group by js.hackathon_id, js.team_id, js.judge_id
)
select
  t.hackathon_id,
  t.id as team_id,
  t.name as team_name,
  hc.id as category_id,
  hc.name as category_name,
  coalesce(avg(jt.judge_total), 0) as average_score,
  coalesce(sum(jt.judge_total), 0) as total_score,
  count(distinct jt.judge_id) as judge_count
from public.teams t
join public.hackathons h on h.id = t.hackathon_id
left join public.project_submissions ps on ps.team_id = t.id
left join public.hackathon_categories hc on hc.id = ps.category_id
left join judge_totals jt on jt.team_id = t.id and jt.hackathon_id = t.hackathon_id
group by t.hackathon_id, t.id, t.name, hc.id, hc.name;

comment on view public.team_scores is 'Aggregated weighted scores per team and category for judging leaderboards.';


-- helper functions supporting role and membership checks for RLS policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.is_judge()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
      and role = 'judge'
  );
$$;

create or replace function public.is_team_member(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members
    where team_id = target_team_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_team_owner(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members
    where team_id = target_team_id
      and user_id = (select auth.uid())
      and is_owner
  );
$$;

create or replace function public.is_assigned_judge(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.judge_assignments
    where team_id = target_team_id
      and judge_id = (select auth.uid())
  );
$$;


-- enable row level security on all newly created tables.
alter table public.hackathons enable row level security;
alter table public.hackathon_categories enable row level security;
alter table public.judging_criteria enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.project_submissions enable row level security;
alter table public.judge_assignments enable row level security;
alter table public.judging_scores enable row level security;


-- hackathons policies: admins manage, everyone can read basics.
create policy "hackathons are readable" on public.hackathons
  for select
  to authenticated, anon
  using ( true );

create policy "admins manage hackathons" on public.hackathons
  for insert
  to authenticated
  with check ( public.is_admin() );

create policy "admins update hackathons" on public.hackathons
  for update
  to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );

create policy "admins delete hackathons" on public.hackathons
  for delete
  to authenticated
  using ( public.is_admin() );


-- categories policies mirror hackathon access.
create policy "categories are readable" on public.hackathon_categories
  for select
  to authenticated, anon
  using ( true );

create policy "admins insert categories" on public.hackathon_categories
  for insert
  to authenticated
  with check ( public.is_admin() );

create policy "admins update categories" on public.hackathon_categories
  for update
  to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );

create policy "admins delete categories" on public.hackathon_categories
  for delete
  to authenticated
  using ( public.is_admin() );


-- judging criteria policies follow admin ownership with readable access.
create policy "criteria are readable" on public.judging_criteria
  for select
  to authenticated, anon
  using ( true );

create policy "admins insert criteria" on public.judging_criteria
  for insert
  to authenticated
  with check ( public.is_admin() );

create policy "admins update criteria" on public.judging_criteria
  for update
  to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );

create policy "admins delete criteria" on public.judging_criteria
  for delete
  to authenticated
  using ( public.is_admin() );


-- teams policies allow members, assigned judges, and admins appropriate access.
create policy "teams readable to stakeholders" on public.teams
  for select
  to authenticated
  using (
    public.is_admin()
    or public.is_team_member(id)
    or public.is_assigned_judge(id)
  );

create policy "team creators insert" on public.teams
  for insert
  to authenticated
  with check (
    public.is_admin()
    or created_by = (select auth.uid())
  );

create policy "team owners update" on public.teams
  for update
  to authenticated
  using (
    public.is_admin()
    or public.is_team_owner(id)
  )
  with check (
    public.is_admin()
    or public.is_team_owner(id)
  );

create policy "team owners delete" on public.teams
  for delete
  to authenticated
  using (
    public.is_admin()
    or public.is_team_owner(id)
  );


-- team_members policies keep membership manageable by owners/admins and visible to stakeholders.
create policy "team_members readable" on public.team_members
  for select
  to authenticated
  using (
    public.is_admin()
    or public.is_team_member(team_id)
    or public.is_assigned_judge(team_id)
  );

create policy "team owners add members" on public.team_members
  for insert
  to authenticated
  with check (
    public.is_admin()
    or public.is_team_owner(team_id)
  );

create policy "team owners update members" on public.team_members
  for update
  to authenticated
  using (
    public.is_admin()
    or public.is_team_owner(team_id)
  )
  with check (
    public.is_admin()
    or public.is_team_owner(team_id)
  );

create policy "team owners remove members" on public.team_members
  for delete
  to authenticated
  using (
    public.is_admin()
    or public.is_team_owner(team_id)
  );


-- project submissions accessible to team stakeholders and judges.
create policy "submissions readable" on public.project_submissions
  for select
  to authenticated
  using (
    public.is_admin()
    or public.is_team_member(team_id)
    or public.is_assigned_judge(team_id)
  );

create policy "team owners insert submissions" on public.project_submissions
  for insert
  to authenticated
  with check (
    public.is_admin()
    or public.is_team_owner(team_id)
  );

create policy "team owners update submissions" on public.project_submissions
  for update
  to authenticated
  using (
    public.is_admin()
    or public.is_team_owner(team_id)
  )
  with check (
    public.is_admin()
    or public.is_team_owner(team_id)
  );

create policy "team owners delete submissions" on public.project_submissions
  for delete
  to authenticated
  using (
    public.is_admin()
    or public.is_team_owner(team_id)
  );


-- judge assignments manageable by admins, viewable by admins and assigned judges.
create policy "assignments readable" on public.judge_assignments
  for select
  to authenticated
  using (
    public.is_admin()
    or judge_id = (select auth.uid())
  );

create policy "admins insert assignments" on public.judge_assignments
  for insert
  to authenticated
  with check ( public.is_admin() );

create policy "admins update assignments" on public.judge_assignments
  for update
  to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );

create policy "admins delete assignments" on public.judge_assignments
  for delete
  to authenticated
  using ( public.is_admin() );


-- judging scores accessible to admins, assigned judges, and relevant team members.
create policy "scores readable" on public.judging_scores
  for select
  to authenticated
  using (
    public.is_admin()
    or judge_id = (select auth.uid())
    or public.is_team_member(team_id)
  );

create policy "assigned judges insert scores" on public.judging_scores
  for insert
  to authenticated
  with check ( judge_id = (select auth.uid()) );

create policy "assigned judges update scores" on public.judging_scores
  for update
  to authenticated
  using ( judge_id = (select auth.uid()) )
  with check ( judge_id = (select auth.uid()) );

create policy "assigned judges delete scores" on public.judging_scores
  for delete
  to authenticated
  using ( judge_id = (select auth.uid()) );


