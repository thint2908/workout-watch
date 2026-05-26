create extension if not exists pgcrypto;

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
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
  started_at timestamptz not null,
  finished_at timestamptz,
  total_duration_seconds int default 0,
  note text,
  created_at timestamptz default now()
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.workout_sessions(id) on delete cascade,
  exercise_id uuid references public.exercises(id),
  exercise_name text not null,
  set_number int not null,
  target_reps int,
  actual_reps int,
  target_seconds int,
  actual_duration_seconds int,
  rest_seconds int,
  created_at timestamptz default now()
);

create index if not exists workout_sets_session_id_idx on public.workout_sets(session_id);
create index if not exists workout_sets_exercise_id_idx on public.workout_sets(exercise_id);
create index if not exists workout_sessions_started_at_idx on public.workout_sessions(started_at desc);

alter table public.exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;

drop policy if exists "public exercises select" on public.exercises;
drop policy if exists "public exercises insert" on public.exercises;
drop policy if exists "public exercises update" on public.exercises;
drop policy if exists "public exercises delete" on public.exercises;

drop policy if exists "public sessions select" on public.workout_sessions;
drop policy if exists "public sessions insert" on public.workout_sessions;
drop policy if exists "public sessions update" on public.workout_sessions;
drop policy if exists "public sessions delete" on public.workout_sessions;

drop policy if exists "public sets select" on public.workout_sets;
drop policy if exists "public sets insert" on public.workout_sets;
drop policy if exists "public sets update" on public.workout_sets;
drop policy if exists "public sets delete" on public.workout_sets;

create policy "public exercises select"
  on public.exercises for select
  to anon
  using (true);

create policy "public exercises insert"
  on public.exercises for insert
  to anon
  with check (true);

create policy "public exercises update"
  on public.exercises for update
  to anon
  using (true)
  with check (true);

create policy "public exercises delete"
  on public.exercises for delete
  to anon
  using (true);

create policy "public sessions select"
  on public.workout_sessions for select
  to anon
  using (true);

create policy "public sessions insert"
  on public.workout_sessions for insert
  to anon
  with check (true);

create policy "public sessions update"
  on public.workout_sessions for update
  to anon
  using (true)
  with check (true);

create policy "public sessions delete"
  on public.workout_sessions for delete
  to anon
  using (true);

create policy "public sets select"
  on public.workout_sets for select
  to anon
  using (true);

create policy "public sets insert"
  on public.workout_sets for insert
  to anon
  with check (true);

create policy "public sets update"
  on public.workout_sets for update
  to anon
  using (true)
  with check (true);

create policy "public sets delete"
  on public.workout_sets for delete
  to anon
  using (true);
