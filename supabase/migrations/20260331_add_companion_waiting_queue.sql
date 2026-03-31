alter table public.companion_participants
  drop constraint if exists companion_participants_role_check;

alter table public.companion_participants
  add constraint companion_participants_role_check
  check (role in ('host', 'participant', 'waiting'));

drop policy if exists "users can join companion rooms as themselves" on public.companion_participants;
create policy "users can join companion rooms as themselves"
on public.companion_participants
for insert
to authenticated
with check (
  auth.uid() = user_id
  and role in ('participant', 'waiting')
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
      and participants.role in ('host', 'participant')
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
      and participants.role in ('host', 'participant')
  )
);
