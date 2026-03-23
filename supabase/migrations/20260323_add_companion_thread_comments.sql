create table if not exists public.companion_thread_comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.companion_threads(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists companion_thread_comments_thread_id_idx
  on public.companion_thread_comments(thread_id, created_at asc);

drop trigger if exists set_companion_thread_comments_updated_at on public.companion_thread_comments;
create trigger set_companion_thread_comments_updated_at
before update on public.companion_thread_comments
for each row execute function public.set_updated_at();

alter table public.companion_thread_comments enable row level security;

drop policy if exists "companion thread comments are viewable by everyone" on public.companion_thread_comments;
create policy "companion thread comments are viewable by everyone"
on public.companion_thread_comments
for select
using (true);

drop policy if exists "participants can create thread comments" on public.companion_thread_comments;
create policy "participants can create thread comments"
on public.companion_thread_comments
for insert
to authenticated
with check (
  auth.uid() = author_user_id
  and exists (
    select 1
    from public.companion_threads threads
    join public.companion_participants participants
      on participants.room_id = threads.room_id
    where threads.id = companion_thread_comments.thread_id
      and participants.user_id = auth.uid()
  )
);

drop policy if exists "authors can update their own thread comments" on public.companion_thread_comments;
create policy "authors can update their own thread comments"
on public.companion_thread_comments
for update
to authenticated
using (auth.uid() = author_user_id)
with check (auth.uid() = author_user_id);

drop policy if exists "authors can delete their own thread comments" on public.companion_thread_comments;
create policy "authors can delete their own thread comments"
on public.companion_thread_comments
for delete
to authenticated
using (auth.uid() = author_user_id);
