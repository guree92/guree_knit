alter table public.companion_participants
  add column if not exists activity_status text not null default 'progress';

alter table public.companion_participants
  add column if not exists last_activity_at timestamptz not null default now();

alter table public.companion_participants
  drop constraint if exists companion_participants_activity_status_check;

alter table public.companion_participants
  add constraint companion_participants_activity_status_check
  check (activity_status in ('progress', 'resting', 'graduated'));

update public.companion_participants
set
  activity_status = coalesce(activity_status, 'progress'),
  last_activity_at = coalesce(last_activity_at, joined_at, now());

create index if not exists companion_participants_room_role_activity_idx
  on public.companion_participants(room_id, role, activity_status);

drop policy if exists "users can update their own participant activity" on public.companion_participants;
create policy "users can update their own participant activity"
on public.companion_participants
for update
to authenticated
using (
  auth.uid() = user_id
  and role in ('host', 'participant')
)
with check (
  auth.uid() = user_id
  and role in ('host', 'participant')
);

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
      and (
        participants.role = 'host'
        or (
          participants.role = 'participant'
          and participants.activity_status = 'progress'
        )
      )
  )
);

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
      and (
        participants.role = 'host'
        or (
          participants.role = 'participant'
          and participants.activity_status = 'progress'
        )
      )
  )
);

create or replace function public.promote_first_waiting_participant(p_room_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  room_capacity integer;
  active_member_count integer;
  waiting_row_id uuid;
  waiting_user_id uuid;
begin
  if p_room_id is null or length(trim(p_room_id)) = 0 then
    return null;
  end if;

  select rooms.capacity
    into room_capacity
  from public.companion_rooms rooms
  where rooms.id = p_room_id;

  if room_capacity is null then
    return null;
  end if;

  select count(*)
    into active_member_count
  from public.companion_participants participants
  where participants.room_id = p_room_id
    and participants.role in ('host', 'participant')
    and participants.activity_status = 'progress'
    and coalesce(participants.last_activity_at, participants.joined_at, now()) >= now() - interval '7 days';

  if active_member_count >= greatest(room_capacity, 0) then
    return null;
  end if;

  select participants.id, participants.user_id
    into waiting_row_id, waiting_user_id
  from public.companion_participants participants
  where participants.room_id = p_room_id
    and participants.role = 'waiting'
  order by participants.joined_at asc
  limit 1
  for update skip locked;

  if waiting_row_id is null then
    return null;
  end if;

  update public.companion_participants
  set role = 'participant',
      joined_at = now(),
      activity_status = 'progress',
      last_activity_at = now()
  where id = waiting_row_id
    and role = 'waiting';

  return waiting_user_id;
end;
$$;

revoke all on function public.promote_first_waiting_participant(text) from public;
grant execute on function public.promote_first_waiting_participant(text) to authenticated;