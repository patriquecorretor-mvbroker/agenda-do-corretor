create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nome text,
  foto text,
  telefone text,
  whatsapp text,
  email text,
  creci text,
  cidade text,
  empresa text,
  horario_inicio time,
  horario_fim time,
  meta_vgv_mensal numeric(14,2) default 0 not null,
  meta_vendas_mensal integer default 0 not null,
  meta_comissao_mensal numeric(14,2) default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  date date not null,
  start_time time not null,
  end_time time,
  type text not null default 'outro' check (type in ('visita', 'reunião', 'ligação', 'follow-up', 'captação', 'plantão', 'documentação', 'conteúdo', 'pessoal', 'outro')),
  location text,
  status text not null default 'agendado' check (status in ('agendado', 'concluído', 'cancelado')),
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  due_time time,
  priority text not null default 'média' check (priority in ('baixa', 'média', 'alta')),
  status text not null default 'pendente' check (status in ('pendente', 'concluída')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  completed_events integer default 0 not null,
  pending_events integer default 0 not null,
  completed_tasks integer default 0 not null,
  pending_tasks integer default 0 not null,
  productivity_percent integer default 0 not null check (productivity_percent between 0 and 100),
  tomorrow_notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, date)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger calendar_events_set_updated_at
before update on public.calendar_events
for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger daily_summaries_set_updated_at
before update on public.daily_summaries
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.calendar_events enable row level security;
alter table public.tasks enable row level security;
alter table public.daily_summaries enable row level security;

create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = user_id);

create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = user_id);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "profiles_delete_own" on public.profiles
for delete using (auth.uid() = user_id);

create policy "calendar_events_select_own" on public.calendar_events
for select using (auth.uid() = user_id);

create policy "calendar_events_insert_own" on public.calendar_events
for insert with check (auth.uid() = user_id);

create policy "calendar_events_update_own" on public.calendar_events
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "calendar_events_delete_own" on public.calendar_events
for delete using (auth.uid() = user_id);

create policy "tasks_select_own" on public.tasks
for select using (auth.uid() = user_id);

create policy "tasks_insert_own" on public.tasks
for insert with check (auth.uid() = user_id);

create policy "tasks_update_own" on public.tasks
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tasks_delete_own" on public.tasks
for delete using (auth.uid() = user_id);

create policy "daily_summaries_select_own" on public.daily_summaries
for select using (auth.uid() = user_id);

create policy "daily_summaries_insert_own" on public.daily_summaries
for insert with check (auth.uid() = user_id);

create policy "daily_summaries_update_own" on public.daily_summaries
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "daily_summaries_delete_own" on public.daily_summaries
for delete using (auth.uid() = user_id);

create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists calendar_events_user_date_idx on public.calendar_events(user_id, date);
create index if not exists calendar_events_user_status_idx on public.calendar_events(user_id, status);
create index if not exists tasks_user_due_date_idx on public.tasks(user_id, due_date);
create index if not exists tasks_user_status_idx on public.tasks(user_id, status);
create index if not exists daily_summaries_user_date_idx on public.daily_summaries(user_id, date);
