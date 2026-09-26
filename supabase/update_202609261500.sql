-- Analytics events table
-- Lightweight event log for tracking visitor interest and usage.

create table if not exists public.analytics_events (
  id         uuid        default gen_random_uuid() primary key,
  event      text        not null,
  page       text,
  user_id    uuid        references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- RLS: anyone may insert; no client reads (all reads via service role from backend)
alter table public.analytics_events enable row level security;

create policy "Anyone can insert analytics"
  on public.analytics_events for insert
  with check (true);

create index if not exists analytics_events_event_idx
  on public.analytics_events (event);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);
