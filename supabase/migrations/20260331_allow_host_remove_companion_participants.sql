drop policy if exists "hosts can remove participants in their rooms" on public.companion_participants;
create policy "hosts can remove participants in their rooms"
on public.companion_participants
for delete
to authenticated
using (
  role <> 'host'
  and exists (
    select 1
    from public.companion_rooms rooms
    where rooms.id = companion_participants.room_id
      and rooms.host_user_id = auth.uid()
  )
);
