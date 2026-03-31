create or replace function public.promote_first_waiting_participant(p_room_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  room_capacity integer;
  participant_count integer;
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
    into participant_count
  from public.companion_participants participants
  where participants.room_id = p_room_id
    and participants.role = 'participant';

  if participant_count >= greatest(room_capacity - 1, 0) then
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
  set role = 'participant', joined_at = now()
  where id = waiting_row_id;

  return waiting_user_id;
end;
$$;

revoke all on function public.promote_first_waiting_participant(text) from public;
grant execute on function public.promote_first_waiting_participant(text) to authenticated;
