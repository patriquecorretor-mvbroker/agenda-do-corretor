create table if not exists public.condominium_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  condominium_id text not null,
  asset_type text not null check (asset_type in ('photo', 'video', 'pdf', 'drive')),
  title text not null check (char_length(title) between 1 and 180),
  file_name text,
  storage_path text,
  external_url text,
  mime_type text,
  file_size bigint check (file_size is null or (file_size > 0 and file_size <= 250000000)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint condominium_assets_source_check check (
    (asset_type = 'drive' and external_url is not null and storage_path is null)
    or
    (asset_type in ('photo', 'video', 'pdf') and storage_path is not null and external_url is null)
  ),
  unique (user_id, storage_path)
);

alter table public.condominium_assets enable row level security;

drop policy if exists condominium_assets_select_own on public.condominium_assets;
drop policy if exists condominium_assets_insert_own on public.condominium_assets;
drop policy if exists condominium_assets_update_own on public.condominium_assets;
drop policy if exists condominium_assets_delete_own on public.condominium_assets;
create policy condominium_assets_select_own on public.condominium_assets for select to authenticated using ((select auth.uid()) = user_id);
create policy condominium_assets_insert_own on public.condominium_assets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy condominium_assets_update_own on public.condominium_assets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy condominium_assets_delete_own on public.condominium_assets for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.condominium_assets from anon;
grant select, insert, update, delete on table public.condominium_assets to authenticated;

create index if not exists condominium_assets_user_condominium_idx on public.condominium_assets(user_id, condominium_id, created_at desc);
create index if not exists condominium_assets_user_type_idx on public.condominium_assets(user_id, asset_type);

drop trigger if exists condominium_assets_set_updated_at on public.condominium_assets;
create trigger condominium_assets_set_updated_at before update on public.condominium_assets for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'condominium-assets',
  'condominium-assets',
  false,
  250000000,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/avif',
    'video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska',
    'application/pdf'
  ]
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists condominium_assets_objects_select_own on storage.objects;
drop policy if exists condominium_assets_objects_insert_own on storage.objects;
drop policy if exists condominium_assets_objects_update_own on storage.objects;
drop policy if exists condominium_assets_objects_delete_own on storage.objects;
create policy condominium_assets_objects_select_own on storage.objects for select to authenticated using (bucket_id = 'condominium-assets' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy condominium_assets_objects_insert_own on storage.objects for insert to authenticated with check (bucket_id = 'condominium-assets' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy condominium_assets_objects_update_own on storage.objects for update to authenticated using (bucket_id = 'condominium-assets' and (storage.foldername(name))[1] = (select auth.uid()::text)) with check (bucket_id = 'condominium-assets' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy condominium_assets_objects_delete_own on storage.objects for delete to authenticated using (bucket_id = 'condominium-assets' and (storage.foldername(name))[1] = (select auth.uid()::text));
