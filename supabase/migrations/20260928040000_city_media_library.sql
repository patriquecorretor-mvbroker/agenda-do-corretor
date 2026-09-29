create table if not exists public.city_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  city text not null check (char_length(city) between 1 and 100),
  neighborhood text,
  media_type text not null check (media_type in ('photo','video')),
  category text not null check (category in ('praia','cidade','gastronomia','lifestyle','infraestrutura','evento','outro')),
  orientation text not null check (orientation in ('vertical','horizontal','quadrado')),
  storage_path text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 120000000),
  tags text[] not null default '{}',
  favorite boolean not null default false,
  captured_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, storage_path)
);

alter table public.city_media enable row level security;
drop policy if exists city_media_select_own on public.city_media;
drop policy if exists city_media_insert_own on public.city_media;
drop policy if exists city_media_update_own on public.city_media;
drop policy if exists city_media_delete_own on public.city_media;
create policy city_media_select_own on public.city_media for select to authenticated using (user_id = (select auth.uid()));
create policy city_media_insert_own on public.city_media for insert to authenticated with check (user_id = (select auth.uid()));
create policy city_media_update_own on public.city_media for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy city_media_delete_own on public.city_media for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.city_media from anon;
grant select, insert, update, delete on table public.city_media to authenticated;
create index if not exists city_media_user_created_idx on public.city_media(user_id, created_at desc);
create index if not exists city_media_user_city_idx on public.city_media(user_id, city);
create index if not exists city_media_user_type_idx on public.city_media(user_id, media_type, category);
create index if not exists city_media_tags_idx on public.city_media using gin(tags);
drop trigger if exists city_media_set_updated_at on public.city_media;
create trigger city_media_set_updated_at before update on public.city_media for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('city-media', 'city-media', false, 120000000, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists city_media_objects_select_own on storage.objects;
drop policy if exists city_media_objects_insert_own on storage.objects;
drop policy if exists city_media_objects_update_own on storage.objects;
drop policy if exists city_media_objects_delete_own on storage.objects;
create policy city_media_objects_select_own on storage.objects for select to authenticated using (bucket_id = 'city-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy city_media_objects_insert_own on storage.objects for insert to authenticated with check (bucket_id = 'city-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy city_media_objects_update_own on storage.objects for update to authenticated using (bucket_id = 'city-media' and (storage.foldername(name))[1] = (select auth.uid()::text)) with check (bucket_id = 'city-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy city_media_objects_delete_own on storage.objects for delete to authenticated using (bucket_id = 'city-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
