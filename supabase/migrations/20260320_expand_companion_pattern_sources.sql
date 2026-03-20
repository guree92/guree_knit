alter table public.companion_rooms
add column if not exists pattern_source_type text
check (pattern_source_type in ('site', 'custom', 'external'));

alter table public.companion_rooms
add column if not exists pattern_external_url text;

alter table public.companion_rooms
add column if not exists custom_pattern_data jsonb;

update public.companion_rooms
set pattern_source_type = case
  when pattern_id is not null then 'site'
  when pattern_external_url is not null then 'external'
  else 'custom'
end
where pattern_source_type is null;
