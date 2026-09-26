-- ═══════════════════════════════════════════════════════════════════════
-- DragonQuest cloud schema (Phase 6)
-- Mirrors the local SQLite tables 1:1 by column name + ownership columns.
-- Row Level Security on every table: a user can only touch their own rows.
-- No derived progression columns (XP/level/streak are computed on-device
-- by the local game engine from the synced ledgers).
-- ═══════════════════════════════════════════════════════════════════════

-- ── Profiles (1:1 with auth.users, created by trigger) ─────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_stage text not null default 'aura',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', 'Warrior'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── User-owned content tables (mirror local columns 1:1) ────────────────
-- UUID strings generated on-device remain the primary keys everywhere, so
-- pushes are idempotent upserts and pulls can never collide.

create table if not exists public.habits (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  notes text,
  icon text not null default 'flash',
  color text not null default '#00E5FF',
  difficulty integer not null default 3,
  schedule_json text not null default '{"type":"daily"}',
  reminder_time text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists habits_user_idx on public.habits (user_id);

create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  notes text,
  due_day date,
  priority integer not null default 2,
  completed_at timestamptz,
  habit_id text references public.habits (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_user_idx on public.tasks (user_id);

create table if not exists public.routines (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  icon text not null default 'layers',
  time_of_day text not null default 'anytime',
  active_days_json text not null default '[0,1,2,3,4,5,6]',
  reminder_time text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists routines_user_idx on public.routines (user_id);

create table if not exists public.routine_items (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_id text not null references public.routines (id) on delete cascade,
  habit_id text references public.habits (id) on delete cascade,
  task_id text references public.tasks (id) on delete cascade,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists routine_items_user_idx on public.routine_items (user_id);

create table if not exists public.goals (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  description text,
  category text,
  target_day date,
  status text not null default 'active',
  xp_reward integer not null default 100,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals (user_id);

create table if not exists public.milestones (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id text not null references public.goals (id) on delete cascade,
  title text not null,
  completed_at timestamptz,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists milestones_user_idx on public.milestones (user_id);

-- ── Append-only ledgers (union-merged on sync; never updated) ───────────
create table if not exists public.daily_completions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  day date not null,
  completed_at timestamptz not null default now(),
  xp_awarded integer not null default 0,
  bonus_multiplier integer not null default 100
);
create index if not exists completions_user_day_idx on public.daily_completions (user_id, day);
-- Same uniqueness the local schema enforces — replayed pushes are no-ops.
create unique index if not exists completions_unique_user_day on public.daily_completions (user_id, entity_type, entity_id, day);

create table if not exists public.xp_transactions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount integer not null,
  source text not null,
  ref_id text,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists xp_user_created_idx on public.xp_transactions (user_id, created_at);

create table if not exists public.mission_claims (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  kind text not null,
  xp_awarded integer not null default 0,
  claimed_at timestamptz not null default now()
);
create unique index if not exists mission_claims_unique_user_day on public.mission_claims (user_id, day, kind);

create table if not exists public.training_sessions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null,
  title text,
  duration_sec integer not null default 0,
  completed_at timestamptz not null default now(),
  day date not null,
  xp_awarded integer not null default 0,
  payload_json text
);
create index if not exists training_user_day_idx on public.training_sessions (user_id, day);

create table if not exists public.journal_entries (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  mood integer,
  energy integer,
  discipline integer,
  accomplished text,
  challenged text,
  learned text,
  tomorrow_intent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists journal_unique_user_day on public.journal_entries (user_id, day);

create table if not exists public.user_achievements (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now()
);
create unique index if not exists user_achievements_unique on public.user_achievements (user_id, achievement_id);

create table if not exists public.user_challenges (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  challenge_id text not null,
  started_day date not null,
  status text not null default 'active',
  finished_day date,
  created_at timestamptz not null default now()
);
create index if not exists user_challenges_user_idx on public.user_challenges (user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- Row Level Security — the security boundary. The publishable key ships
-- in the app; these policies are what keep every row private.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.tasks enable row level security;
alter table public.routines enable row level security;
alter table public.routine_items enable row level security;
alter table public.goals enable row level security;
alter table public.milestones enable row level security;
alter table public.daily_completions enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.mission_claims enable row level security;
alter table public.training_sessions enable row level security;
alter table public.journal_entries enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_challenges enable row level security;

-- Profiles: read/update own; insert happens via the (security definer) trigger.
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Every user table: full CRUD strictly scoped to the owner.
do $$
declare
  t text;
begin
  foreach t in array array[
    'habits', 'tasks', 'routines', 'routine_items', 'goals', 'milestones',
    'daily_completions', 'xp_transactions', 'mission_claims',
    'training_sessions', 'journal_entries', 'user_achievements', 'user_challenges'
  ] loop
    execute format('create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);', t || '_own', t);
  end loop;
end;
$$;

-- Grants: the authenticated role operates user data; anon gets nothing
-- (signed-out usage is fully local, per the Phase 6 design).
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
