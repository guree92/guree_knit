-- Companion feature schema for Knit.GUREE
-- Apply this in Supabase SQL editor or your migration workflow.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.companion_rooms (
  id text primary key,
  host_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  pattern_name text not null,
  summary text not null,
  start_date date not null,
  end_date date not null,
  recruit_until date not null,
  level text not null check (level in ('입문', '초중급', '중급', '중상급', '고급')),
  capacity integer not null check (capacity >= 2),
  status text not null default '모집중' check (status in ('모집중', '곧 시작', '진행중', '완료')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companion_rooms_date_order check (
    recruit_until <= start_date and start_date <= end_date
  )
);

create table if not exists public.companion_participants (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.companion_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'participant' check (role in ('host', 'participant')),
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create table if not exists public.companion_notices (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.companion_rooms(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  is_pinned boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companion_supplies (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.companion_rooms(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companion_supply_checks (
  id uuid primary key default gen_random_uuid(),
  supply_id uuid not null references public.companion_supplies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  checked_at timestamptz not null default now(),
  unique (supply_id, user_id)
);

create table if not exists public.companion_threads (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.companion_rooms(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('question', 'certification')),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companion_checkins (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.companion_rooms(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists companion_rooms_host_user_id_idx
  on public.companion_rooms(host_user_id);

create index if not exists companion_rooms_status_idx
  on public.companion_rooms(status);

create index if not exists companion_participants_room_id_idx
  on public.companion_participants(room_id);

create index if not exists companion_participants_user_id_idx
  on public.companion_participants(user_id);

create index if not exists companion_notices_room_id_idx
  on public.companion_notices(room_id, created_at desc);

create index if not exists companion_supplies_room_id_idx
  on public.companion_supplies(room_id, sort_order asc);

create index if not exists companion_threads_room_id_idx
  on public.companion_threads(room_id, created_at desc);

create index if not exists companion_threads_type_idx
  on public.companion_threads(type);

create index if not exists companion_checkins_room_id_idx
  on public.companion_checkins(room_id, created_at desc);

drop trigger if exists set_companion_rooms_updated_at on public.companion_rooms;
create trigger set_companion_rooms_updated_at
before update on public.companion_rooms
for each row execute function public.set_updated_at();

drop trigger if exists set_companion_notices_updated_at on public.companion_notices;
create trigger set_companion_notices_updated_at
before update on public.companion_notices
for each row execute function public.set_updated_at();

drop trigger if exists set_companion_supplies_updated_at on public.companion_supplies;
create trigger set_companion_supplies_updated_at
before update on public.companion_supplies
for each row execute function public.set_updated_at();

drop trigger if exists set_companion_threads_updated_at on public.companion_threads;
create trigger set_companion_threads_updated_at
before update on public.companion_threads
for each row execute function public.set_updated_at();

drop trigger if exists set_companion_checkins_updated_at on public.companion_checkins;
create trigger set_companion_checkins_updated_at
before update on public.companion_checkins
for each row execute function public.set_updated_at();

alter table public.companion_rooms enable row level security;
alter table public.companion_participants enable row level security;
alter table public.companion_notices enable row level security;
alter table public.companion_supplies enable row level security;
alter table public.companion_supply_checks enable row level security;
alter table public.companion_threads enable row level security;
alter table public.companion_checkins enable row level security;

drop policy if exists "companion rooms are viewable by everyone" on public.companion_rooms;
create policy "companion rooms are viewable by everyone"
on public.companion_rooms
for select
using (true);

drop policy if exists "authenticated users can create companion rooms" on public.companion_rooms;
create policy "authenticated users can create companion rooms"
on public.companion_rooms
for insert
to authenticated
with check (auth.uid() = host_user_id);

drop policy if exists "hosts can update their companion rooms" on public.companion_rooms;
create policy "hosts can update their companion rooms"
on public.companion_rooms
for update
to authenticated
using (auth.uid() = host_user_id)
with check (auth.uid() = host_user_id);

drop policy if exists "hosts can delete their companion rooms" on public.companion_rooms;
create policy "hosts can delete their companion rooms"
on public.companion_rooms
for delete
to authenticated
using (auth.uid() = host_user_id);

drop policy if exists "participants are viewable by everyone" on public.companion_participants;
create policy "participants are viewable by everyone"
on public.companion_participants
for select
using (true);

drop policy if exists "users can join companion rooms as themselves" on public.companion_participants;
create policy "users can join companion rooms as themselves"
on public.companion_participants
for insert
to authenticated
with check (
  auth.uid() = user_id
  and role = 'participant'
);

drop policy if exists "hosts can add themselves to companion rooms" on public.companion_participants;
create policy "hosts can add themselves to companion rooms"
on public.companion_participants
for insert
to authenticated
with check (
  auth.uid() = user_id
  and role = 'host'
  and exists (
    select 1
    from public.companion_rooms rooms
    where rooms.id = room_id and rooms.host_user_id = auth.uid()
  )
);

drop policy if exists "users can leave rooms they joined" on public.companion_participants;
create policy "users can leave rooms they joined"
on public.companion_participants
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "companion notices are viewable by everyone" on public.companion_notices;
create policy "companion notices are viewable by everyone"
on public.companion_notices
for select
using (true);

drop policy if exists "hosts can create notices for their rooms" on public.companion_notices;
create policy "hosts can create notices for their rooms"
on public.companion_notices
for insert
to authenticated
with check (
  auth.uid() = author_user_id
  and exists (
    select 1
    from public.companion_rooms rooms
    where rooms.id = room_id and rooms.host_user_id = auth.uid()
  )
);

drop policy if exists "hosts can update notices for their rooms" on public.companion_notices;
create policy "hosts can update notices for their rooms"
on public.companion_notices
for update
to authenticated
using (
  exists (
    select 1
    from public.companion_rooms rooms
    where rooms.id = room_id and rooms.host_user_id = auth.uid()
  )
)
with check (
  auth.uid() = author_user_id
  and exists (
    select 1
    from public.companion_rooms rooms
    where rooms.id = room_id and rooms.host_user_id = auth.uid()
  )
);

drop policy if exists "hosts can delete notices for their rooms" on public.companion_notices;
create policy "hosts can delete notices for their rooms"
on public.companion_notices
for delete
to authenticated
using (
  exists (
    select 1
    from public.companion_rooms rooms
    where rooms.id = room_id and rooms.host_user_id = auth.uid()
  )
);

drop policy if exists "companion supplies are viewable by everyone" on public.companion_supplies;
create policy "companion supplies are viewable by everyone"
on public.companion_supplies
for select
using (true);

drop policy if exists "hosts can manage supplies for their rooms" on public.companion_supplies;
create policy "hosts can manage supplies for their rooms"
on public.companion_supplies
for all
to authenticated
using (
  exists (
    select 1
    from public.companion_rooms rooms
    where rooms.id = room_id and rooms.host_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.companion_rooms rooms
    where rooms.id = room_id and rooms.host_user_id = auth.uid()
  )
);

drop policy if exists "supply checks are viewable by everyone" on public.companion_supply_checks;
create policy "supply checks are viewable by everyone"
on public.companion_supply_checks
for select
using (true);

drop policy if exists "users can manage their own supply checks" on public.companion_supply_checks;
create policy "users can manage their own supply checks"
on public.companion_supply_checks
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "companion threads are viewable by everyone" on public.companion_threads;
create policy "companion threads are viewable by everyone"
on public.companion_threads
for select
using (true);

drop policy if exists "participants can create room threads" on public.companion_threads;
create policy "participants can create room threads"
on public.companion_threads
for insert
to authenticated
with check (
  auth.uid() = author_user_id
  and exists (
    select 1
    from public.companion_participants participants
    where participants.room_id = companion_threads.room_id
      and participants.user_id = auth.uid()
  )
);

drop policy if exists "authors can update their own room threads" on public.companion_threads;
create policy "authors can update their own room threads"
on public.companion_threads
for update
to authenticated
using (auth.uid() = author_user_id)
with check (auth.uid() = author_user_id);

drop policy if exists "authors can delete their own room threads" on public.companion_threads;
create policy "authors can delete their own room threads"
on public.companion_threads
for delete
to authenticated
using (auth.uid() = author_user_id);

drop policy if exists "companion checkins are viewable by everyone" on public.companion_checkins;
create policy "companion checkins are viewable by everyone"
on public.companion_checkins
for select
using (true);

drop policy if exists "participants can create room checkins" on public.companion_checkins;
create policy "participants can create room checkins"
on public.companion_checkins
for insert
to authenticated
with check (
  auth.uid() = author_user_id
  and exists (
    select 1
    from public.companion_participants participants
    where participants.room_id = companion_checkins.room_id
      and participants.user_id = auth.uid()
  )
);

drop policy if exists "authors can update their own room checkins" on public.companion_checkins;
create policy "authors can update their own room checkins"
on public.companion_checkins
for update
to authenticated
using (auth.uid() = author_user_id)
with check (auth.uid() = author_user_id);

drop policy if exists "authors can delete their own room checkins" on public.companion_checkins;
create policy "authors can delete their own room checkins"
on public.companion_checkins
for delete
to authenticated
using (auth.uid() = author_user_id);
