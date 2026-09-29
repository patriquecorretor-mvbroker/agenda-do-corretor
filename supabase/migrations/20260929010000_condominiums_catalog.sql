create table if not exists public.condominiums (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  city text not null,
  neighborhood text,
  status text not null default 'a confirmar' check (status in ('entregue', 'em obras', 'lançamento', 'a confirmar')),
  developer text,
  launch_year integer check (launch_year is null or launch_year between 1900 and 2200),
  total_units integer check (total_units is null or total_units >= 0),
  area_ha numeric(10,2) check (area_ha is null or area_ha >= 0),
  unit_type text not null default 'não informado' check (unit_type in ('lotes', 'casas', 'apartamentos', 'misto', 'não informado')),
  area_min numeric(12,2) check (area_min is null or area_min >= 0),
  area_max numeric(12,2) check (area_max is null or area_max >= 0),
  has_beach_club boolean not null default false,
  amenities text[] not null default '{}',
  description text,
  cover_url text,
  source_url text,
  source_title text,
  source_checked_at date,
  verification_status text not null default 'manual' check (verification_status in ('web', 'verificado', 'manual', 'pendente')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists condominiums_user_id_idx on public.condominiums(user_id);
create index if not exists condominiums_city_idx on public.condominiums(city);
create index if not exists condominiums_neighborhood_idx on public.condominiums(neighborhood);
create index if not exists condominiums_status_idx on public.condominiums(status);

alter table public.condominiums enable row level security;

drop policy if exists "Users select own condominiums" on public.condominiums;
create policy "Users select own condominiums" on public.condominiums for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own condominiums" on public.condominiums;
create policy "Users insert own condominiums" on public.condominiums for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own condominiums" on public.condominiums;
create policy "Users update own condominiums" on public.condominiums for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete own condominiums" on public.condominiums;
create policy "Users delete own condominiums" on public.condominiums for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.condominiums to authenticated;

alter table public.calendar_events
  add column if not exists condominium_id text;

create index if not exists calendar_events_user_condominium_idx
  on public.calendar_events(user_id, condominium_id)
  where condominium_id is not null;

create or replace function public.set_condominiums_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists condominiums_set_updated_at on public.condominiums;
create trigger condominiums_set_updated_at before update on public.condominiums
for each row execute function public.set_condominiums_updated_at();
