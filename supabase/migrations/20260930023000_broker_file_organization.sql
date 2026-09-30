alter table public.broker_files
  add column if not exists folder text not null default 'Geral' check (char_length(folder) between 1 and 80),
  add column if not exists is_favorite boolean not null default false;

create index if not exists broker_files_user_folder_idx on public.broker_files(user_id, folder);
create index if not exists broker_files_user_favorite_idx on public.broker_files(user_id, is_favorite) where is_favorite = true;
