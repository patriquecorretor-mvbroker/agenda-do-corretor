create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  phone text,
  whatsapp text,
  email text,
  city text,
  neighborhood text,
  property_profile text,
  budget_min numeric(14,2),
  budget_max numeric(14,2),
  bedrooms smallint,
  notes text,
  source text,
  status text not null default 'lead' check (status in ('lead','em contato','qualificado','visita agendada','proposta','negociação','venda realizada','pós-venda','perdido')),
  sale_date date,
  next_follow_up date,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (budget_min is null or budget_min >= 0),
  check (budget_max is null or budget_max >= 0),
  check (budget_min is null or budget_max is null or budget_max >= budget_min),
  check (lat is null or lat between -90 and 90),
  check (lng is null or lng between -180 and 180)
);

create table if not exists public.client_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  type text not null check (type in ('cadastro','mudança de etapa','ligação','mensagem','visita','proposta','venda','follow-up','observação')),
  title text not null,
  details text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.calendar_events add column if not exists client_id uuid references public.clients(id) on delete set null;

alter table public.clients enable row level security;
alter table public.client_activities enable row level security;

create policy "clients_select_own" on public.clients for select using (auth.uid() = user_id);
create policy "clients_insert_own" on public.clients for insert with check (auth.uid() = user_id);
create policy "clients_update_own" on public.clients for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "clients_delete_own" on public.clients for delete using (auth.uid() = user_id);
create policy "client_activities_select_own" on public.client_activities for select using (auth.uid() = user_id);
create policy "client_activities_insert_own" on public.client_activities for insert with check (auth.uid() = user_id);
create policy "client_activities_update_own" on public.client_activities for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "client_activities_delete_own" on public.client_activities for delete using (auth.uid() = user_id);

create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();
create index clients_user_status_idx on public.clients(user_id, status);
create index clients_user_follow_up_idx on public.clients(user_id, next_follow_up);
create index clients_user_sale_date_idx on public.clients(user_id, sale_date);
create index client_activities_client_date_idx on public.client_activities(user_id, client_id, occurred_at desc);
create index calendar_events_client_idx on public.calendar_events(user_id, client_id);
