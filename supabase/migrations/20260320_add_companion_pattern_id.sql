alter table public.companion_rooms
add column if not exists pattern_id text references public.patterns(id) on delete set null;

create index if not exists companion_rooms_pattern_id_idx
  on public.companion_rooms(pattern_id);
