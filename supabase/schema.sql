create extension if not exists "pgcrypto";

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists wishes_created_at_idx on public.wishes (created_at desc);

create table if not exists public.loto_sessions (
  id uuid primary key default gen_random_uuid(),
  target_count int not null check (target_count between 20 and 30),
  deck int[] not null,
  status text not null default 'waiting',
  min_winners int not null default 3,
  created_at timestamptz not null default now()
);

create index if not exists loto_sessions_created_at_idx on public.loto_sessions (created_at desc);

create table if not exists public.loto_draws (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.loto_sessions(id) on delete cascade,
  number int not null check (number between 1 and 90),
  draw_order int not null check (draw_order > 0),
  created_at timestamptz not null default now(),
  unique (session_id, draw_order),
  unique (session_id, number)
);

create index if not exists loto_draws_session_idx on public.loto_draws (session_id);
create index if not exists loto_draws_order_idx on public.loto_draws (session_id, draw_order);

create table if not exists public.loto_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.loto_sessions(id) on delete cascade,
  name text not null,
  player_token text not null,
  card int[] not null,
  created_at timestamptz not null default now(),
  unique (session_id, player_token)
);

create index if not exists loto_players_session_idx on public.loto_players (session_id);

alter table public.wishes enable row level security;
alter table public.loto_sessions enable row level security;
alter table public.loto_draws enable row level security;
alter table public.loto_players enable row level security;

create policy "Allow read wishes"
  on public.wishes
  for select
  using (true);

create policy "Allow insert wishes"
  on public.wishes
  for insert
  with check (true);

create policy "Allow read loto sessions"
  on public.loto_sessions
  for select
  using (true);

create policy "Allow insert loto sessions"
  on public.loto_sessions
  for insert
  with check (true);

create policy "Allow update loto sessions"
  on public.loto_sessions
  for update
  using (true)
  with check (true);

create policy "Allow read loto draws"
  on public.loto_draws
  for select
  using (true);

create policy "Allow insert loto draws"
  on public.loto_draws
  for insert
  with check (true);

create policy "Allow read loto players"
  on public.loto_players
  for select
  using (true);

create policy "Allow insert loto players"
  on public.loto_players
  for insert
  with check (true);

create policy "Allow update loto players"
  on public.loto_players
  for update
  using (true)
  with check (true);
