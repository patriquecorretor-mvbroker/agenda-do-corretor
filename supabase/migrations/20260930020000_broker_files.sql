create table if not exists public.broker_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  title text not null check (char_length(title) between 1 and 180),
  category text not null default 'Geral' check (char_length(category) between 1 and 80),
  file_type text not null check (file_type in ('image', 'pdf', 'link')),
  file_name text,
  storage_path text,
  external_url text,
  mime_type text,
  file_size bigint check (file_size is null or (file_size > 0 and file_size <= 30000000)),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint broker_files_source_check check (
    (file_type = 'link' and external_url is not null and storage_path is null)
    or
    (file_type in ('image', 'pdf') and storage_path is not null and external_url is null)
  ),
  unique (user_id, storage_path)
);

alter table public.broker_files enable row level security;

create policy broker_files_select_own on public.broker_files for select to authenticated using ((select auth.uid()) = user_id);
create policy broker_files_insert_own on public.broker_files for insert to authenticated with check ((select auth.uid()) = user_id);
create policy broker_files_update_own on public.broker_files for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy broker_files_delete_own on public.broker_files for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.broker_files from anon;
grant select, insert, update, delete on table public.broker_files to authenticated;

create index broker_files_user_created_idx on public.broker_files(user_id, created_at desc);
create index broker_files_user_client_idx on public.broker_files(user_id, client_id) where client_id is not null;
create index broker_files_user_type_idx on public.broker_files(user_id, file_type);
create index broker_files_user_category_idx on public.broker_files(user_id, category);

create trigger broker_files_set_updated_at before update on public.broker_files for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'broker-files',
  'broker-files',
  false,
  30000000,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/avif', 'application/pdf']
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy broker_files_objects_select_own on storage.objects for select to authenticated using (bucket_id = 'broker-files' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy broker_files_objects_insert_own on storage.objects for insert to authenticated with check (bucket_id = 'broker-files' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy broker_files_objects_update_own on storage.objects for update to authenticated using (bucket_id = 'broker-files' and (storage.foldername(name))[1] = (select auth.uid()::text)) with check (bucket_id = 'broker-files' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy broker_files_objects_delete_own on storage.objects for delete to authenticated using (bucket_id = 'broker-files' and (storage.foldername(name))[1] = (select auth.uid()::text));
