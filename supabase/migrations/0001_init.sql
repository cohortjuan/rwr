-- RWR initial schema, applied to the "rwr" Supabase project on 2026-10-05.
-- Every table is locked to its owner with row level security.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  entry_choice text check (entry_choice in ('starting', 'changing', 'stuck', 'curious')),
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  phase text not null check (phase in ('Onboarding', 'Passion', 'Vocation', 'Mission', 'Profession', 'Crossroads')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.interview_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'todah')),
  content text not null check (char_length(content) <= 2000),
  created_at timestamptz not null default now()
);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quadrant text not null check (quadrant in ('passion', 'vocation', 'mission', 'profession')),
  claim_text text not null,
  evidence_level text not null default 'unsupported' check (evidence_level in ('strong', 'mixed', 'unsupported')),
  created_at timestamptz not null default now()
);

create table public.roadmap_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  position integer not null default 0,
  step_text text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.upgrades (
  user_id uuid not null references auth.users (id) on delete cascade,
  slot text not null check (slot in ('mane', 'claws', 'paws', 'tracks', 'instincts', 'den', 'pride')),
  content text not null default '' check (char_length(content) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

create table public.goals (
  user_id uuid primary key references auth.users (id) on delete cascade,
  goal_text text not null check (char_length(goal_text) <= 200),
  achieved_at timestamptz,
  updated_at timestamptz not null default now()
);

create index interview_sessions_user_id_idx on public.interview_sessions (user_id);
create index messages_session_id_idx on public.messages (session_id);
create index messages_user_id_idx on public.messages (user_id);
create index claims_user_id_idx on public.claims (user_id);
create index roadmap_steps_user_id_idx on public.roadmap_steps (user_id);

alter table public.profiles enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.messages enable row level security;
alter table public.claims enable row level security;
alter table public.roadmap_steps enable row level security;
alter table public.upgrades enable row level security;
alter table public.goals enable row level security;

create policy "Players manage their own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Players manage their own sessions" on public.interview_sessions
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Players manage their own messages" on public.messages
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Players manage their own claims" on public.claims
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Players manage their own roadmap" on public.roadmap_steps
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Players manage their own upgrades" on public.upgrades
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Players manage their own goal" on public.goals
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
