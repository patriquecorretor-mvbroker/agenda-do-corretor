create table public.client_map_marks (
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  sold boolean,
  photo text check (photo is null or length(photo) <= 420000),
  visits jsonb not null default '[]'::jsonb check (jsonb_typeof(visits) = 'array'),
  created_at timestamptz not null default now(),
  primary key (user_id, client_id)
);
alter table public.client_map_marks enable row level security;
create policy "Own client marks select" on public.client_map_marks for select to authenticated using (auth.uid() = user_id);
create policy "Own client marks insert" on public.client_map_marks for insert to authenticated with check (auth.uid() = user_id);
create policy "Own client marks update" on public.client_map_marks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own client marks delete" on public.client_map_marks for delete to authenticated using (auth.uid() = user_id);
