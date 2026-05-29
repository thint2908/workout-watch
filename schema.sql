create extension if not exists pgcrypto;

-- Single-user lock. Change this email if you move the app to another owner.
create or replace function public.is_allowed_owner()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'thint2908@gmail.com';
$$;

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  name text not null,
  body_part text not null,
  type text not null check (type in ('reps', 'time')),
  default_sets int default 3,
  default_reps int,
  default_seconds int,
  default_rest_seconds int default 60,
  difficulty text default 'normal',
  note text,
  created_at timestamptz default now()
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  started_at timestamptz not null,
  finished_at timestamptz,
  total_duration_seconds int default 0,
  note text,
  created_at timestamptz default now()
);

create table if not exists public.workout_presets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  name text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (owner_id, name)
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  session_id uuid references public.workout_sessions(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  exercise_name text not null,
  set_number int not null,
  target_reps int,
  actual_reps int,
  target_seconds int,
  actual_duration_seconds int,
  rest_seconds int,
  created_at timestamptz default now()
);

alter table public.exercises add column if not exists owner_id uuid default auth.uid();
alter table public.workout_sessions add column if not exists owner_id uuid default auth.uid();
alter table public.workout_presets add column if not exists owner_id uuid default auth.uid();
alter table public.workout_sets add column if not exists owner_id uuid default auth.uid();

alter table public.workout_sets drop constraint if exists workout_sets_exercise_id_fkey;
alter table public.workout_sets
  add constraint workout_sets_exercise_id_fkey
  foreign key (exercise_id) references public.exercises(id) on delete set null;

update public.exercises
set owner_id = (select id from auth.users where lower(email) = 'thint2908@gmail.com' limit 1)
where owner_id is null
  and exists (select 1 from auth.users where lower(email) = 'thint2908@gmail.com');

update public.workout_sessions
set owner_id = (select id from auth.users where lower(email) = 'thint2908@gmail.com' limit 1)
where owner_id is null
  and exists (select 1 from auth.users where lower(email) = 'thint2908@gmail.com');

update public.workout_presets
set owner_id = (select id from auth.users where lower(email) = 'thint2908@gmail.com' limit 1)
where owner_id is null
  and exists (select 1 from auth.users where lower(email) = 'thint2908@gmail.com');

update public.workout_sets
set owner_id = (select id from auth.users where lower(email) = 'thint2908@gmail.com' limit 1)
where owner_id is null
  and exists (select 1 from auth.users where lower(email) = 'thint2908@gmail.com');

create index if not exists exercises_owner_id_idx on public.exercises(owner_id);
create index if not exists workout_sets_owner_id_idx on public.workout_sets(owner_id);
create index if not exists workout_sets_session_id_idx on public.workout_sets(session_id);
create index if not exists workout_sets_exercise_id_idx on public.workout_sets(exercise_id);
create index if not exists workout_sessions_owner_id_idx on public.workout_sessions(owner_id);
create index if not exists workout_sessions_started_at_idx on public.workout_sessions(started_at desc);
create index if not exists workout_presets_owner_id_idx on public.workout_presets(owner_id);
create index if not exists workout_presets_name_idx on public.workout_presets(name);

alter table public.exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_presets enable row level security;
alter table public.workout_sets enable row level security;

revoke all on public.exercises from anon;
revoke all on public.workout_sessions from anon;
revoke all on public.workout_presets from anon;
revoke all on public.workout_sets from anon;

grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.workout_presets to authenticated;
grant select, insert, update, delete on public.workout_sets to authenticated;

drop policy if exists "public exercises select" on public.exercises;
drop policy if exists "public exercises insert" on public.exercises;
drop policy if exists "public exercises update" on public.exercises;
drop policy if exists "public exercises delete" on public.exercises;
drop policy if exists "owner exercises select" on public.exercises;
drop policy if exists "owner exercises insert" on public.exercises;
drop policy if exists "owner exercises update" on public.exercises;
drop policy if exists "owner exercises delete" on public.exercises;

drop policy if exists "public sessions select" on public.workout_sessions;
drop policy if exists "public sessions insert" on public.workout_sessions;
drop policy if exists "public sessions update" on public.workout_sessions;
drop policy if exists "public sessions delete" on public.workout_sessions;
drop policy if exists "owner sessions select" on public.workout_sessions;
drop policy if exists "owner sessions insert" on public.workout_sessions;
drop policy if exists "owner sessions update" on public.workout_sessions;
drop policy if exists "owner sessions delete" on public.workout_sessions;
drop policy if exists "owner presets select" on public.workout_presets;
drop policy if exists "owner presets insert" on public.workout_presets;
drop policy if exists "owner presets update" on public.workout_presets;
drop policy if exists "owner presets delete" on public.workout_presets;

drop policy if exists "public sets select" on public.workout_sets;
drop policy if exists "public sets insert" on public.workout_sets;
drop policy if exists "public sets update" on public.workout_sets;
drop policy if exists "public sets delete" on public.workout_sets;
drop policy if exists "owner sets select" on public.workout_sets;
drop policy if exists "owner sets insert" on public.workout_sets;
drop policy if exists "owner sets update" on public.workout_sets;
drop policy if exists "owner sets delete" on public.workout_sets;

create policy "owner exercises select"
  on public.exercises for select
  to authenticated
  using (public.is_allowed_owner() and owner_id = auth.uid());

create policy "owner exercises insert"
  on public.exercises for insert
  to authenticated
  with check (public.is_allowed_owner() and owner_id = auth.uid());

create policy "owner exercises update"
  on public.exercises for update
  to authenticated
  using (public.is_allowed_owner() and owner_id = auth.uid())
  with check (public.is_allowed_owner() and owner_id = auth.uid());

create policy "owner exercises delete"
  on public.exercises for delete
  to authenticated
  using (public.is_allowed_owner() and owner_id = auth.uid());

create policy "owner sessions select"
  on public.workout_sessions for select
  to authenticated
  using (public.is_allowed_owner() and owner_id = auth.uid());

create policy "owner sessions insert"
  on public.workout_sessions for insert
  to authenticated
  with check (public.is_allowed_owner() and owner_id = auth.uid());

create policy "owner sessions update"
  on public.workout_sessions for update
  to authenticated
  using (public.is_allowed_owner() and owner_id = auth.uid())
  with check (public.is_allowed_owner() and owner_id = auth.uid());

create policy "owner sessions delete"
  on public.workout_sessions for delete
  to authenticated
  using (public.is_allowed_owner() and owner_id = auth.uid());

create policy "owner presets select"
  on public.workout_presets for select
  to authenticated
  using (public.is_allowed_owner() and owner_id = auth.uid());

create policy "owner presets insert"
  on public.workout_presets for insert
  to authenticated
  with check (public.is_allowed_owner() and owner_id = auth.uid());

create policy "owner presets update"
  on public.workout_presets for update
  to authenticated
  using (public.is_allowed_owner() and owner_id = auth.uid())
  with check (public.is_allowed_owner() and owner_id = auth.uid());

create policy "owner presets delete"
  on public.workout_presets for delete
  to authenticated
  using (public.is_allowed_owner() and owner_id = auth.uid());

create policy "owner sets select"
  on public.workout_sets for select
  to authenticated
  using (public.is_allowed_owner() and owner_id = auth.uid());

create policy "owner sets insert"
  on public.workout_sets for insert
  to authenticated
  with check (
    public.is_allowed_owner()
    and owner_id = auth.uid()
    and exists (
      select 1 from public.workout_sessions
      where id = session_id and owner_id = auth.uid()
    )
    and (
      exercise_id is null
      or exists (
        select 1 from public.exercises
        where id = exercise_id and owner_id = auth.uid()
      )
    )
  );

create policy "owner sets update"
  on public.workout_sets for update
  to authenticated
  using (public.is_allowed_owner() and owner_id = auth.uid())
  with check (public.is_allowed_owner() and owner_id = auth.uid());

create policy "owner sets delete"
  on public.workout_sets for delete
  to authenticated
  using (public.is_allowed_owner() and owner_id = auth.uid());
