-- AiFlow — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ── User Profiles ──────────────────────────────────────────────────────────
-- Extends auth.users with access control state.
-- id mirrors auth.users.id (UUID).

create table if not exists public.user_profiles (
  id                   uuid        references auth.users(id) on delete cascade primary key,
  email                text        not null,
  access_status        text        not null default 'pending'
                                   check (access_status in ('pending', 'approved', 'demo', 'disabled')),
  role                 text        not null default 'user'
                                   check (role in ('user', 'demo', 'admin')),
  must_change_password boolean     not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  last_login           timestamptz
);

-- If the table already exists (re-running on an existing project), add the column:
alter table public.user_profiles
  add column if not exists must_change_password boolean not null default false;

-- Auto-create a profile row whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at on every change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_profiles_updated_at on public.user_profiles;
create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row execute procedure public.set_updated_at();


-- ── Access Requests ─────────────────────────────────────────────────────────
-- Public visitors submit these; admin approves or rejects.

create table if not exists public.access_requests (
  id           uuid        default gen_random_uuid() primary key,
  name         text        not null,
  email        text        not null,
  linkedin_url text,
  company      text,
  message      text,
  status       text        not null default 'pending'
               check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now()
);


-- ── Usage Tracking ──────────────────────────────────────────────────────────
-- Per-user daily counters for executions and LLM requests.
-- Used to enforce demo limits and provide usage feedback to users.

create table if not exists public.usage_tracking (
  id           uuid    default gen_random_uuid() primary key,
  user_id      uuid    references auth.users(id) on delete cascade not null,
  date         date    not null default current_date,
  executions   integer not null default 0,
  llm_requests integer not null default 0,
  unique (user_id, date)
);


-- ── Row Level Security ──────────────────────────────────────────────────────

alter table public.user_profiles    enable row level security;
alter table public.access_requests  enable row level security;
alter table public.usage_tracking   enable row level security;

-- user_profiles: each user can read and update their own row only.
create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own last_login"
  on public.user_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- access_requests: anyone (unauthenticated too) can insert; nobody can read.
-- Reads happen only via service role (backend admin endpoints).
create policy "Anyone can submit access request"
  on public.access_requests for insert
  with check (true);

-- usage_tracking: users can read their own row; backend increments via service role.
create policy "Users can view own usage"
  on public.usage_tracking for select
  using (auth.uid() = user_id);


-- ── Analytics Events ────────────────────────────────────────────────────────
-- Lightweight event log (page views, logins, workflow usage).
-- Inserts are public; all reads go via backend service role.

create table if not exists public.analytics_events (
  id         uuid        default gen_random_uuid() primary key,
  event      text        not null,
  page       text,
  user_id    uuid        references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

create policy "Anyone can insert analytics"
  on public.analytics_events for insert
  with check (true);


-- ── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists user_profiles_access_status_idx
  on public.user_profiles (access_status);

create index if not exists access_requests_status_idx
  on public.access_requests (status);

create index if not exists usage_tracking_user_date_idx
  on public.usage_tracking (user_id, date);

create index if not exists analytics_events_event_idx
  on public.analytics_events (event);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);
