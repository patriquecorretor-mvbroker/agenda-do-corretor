alter table public.buildings
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists city text not null default 'Capão da Canoa',
  add column if not exists state text not null default 'RS',
  add column if not exists cover_url text,
  add column if not exists cover_source_url text,
  add column if not exists cover_source_title text,
  add column if not exists builder text,
  add column if not exists developer text,
  add column if not exists construction_year integer check (construction_year between 1800 and 2200),
  add column if not exists delivery_year integer check (delivery_year between 1800 and 2200),
  add column if not exists towers integer check (towers >= 0),
  add column if not exists floors integer check (floors >= 0),
  add column if not exists total_units integer check (total_units >= 0),
  add column if not exists units_per_floor integer check (units_per_floor >= 0),
  add column if not exists elevators integer check (elevators >= 0),
  add column if not exists parking_spaces integer check (parking_spaces >= 0),
  add column if not exists bedrooms_min integer check (bedrooms_min >= 0),
  add column if not exists bedrooms_max integer check (bedrooms_max >= 0),
  add column if not exists private_area_min numeric(10,2) check (private_area_min >= 0),
  add column if not exists private_area_max numeric(10,2) check (private_area_max >= 0),
  add column if not exists amenities text[] not null default '{}',
  add column if not exists description text,
  add column if not exists website_url text,
  add column if not exists source_url text,
  add column if not exists source_title text,
  add column if not exists source_checked_at date,
  add column if not exists verification_status text not null default 'pendente' check (verification_status in ('pendente', 'web', 'verificado', 'manual')),
  add column if not exists notes text;

drop policy if exists buildings_read_catalog on public.buildings;
drop policy if exists buildings_insert_own on public.buildings;
drop policy if exists buildings_update_own on public.buildings;
drop policy if exists buildings_delete_own on public.buildings;
create policy buildings_read_catalog on public.buildings for select to authenticated
using (user_id is null or user_id = (select auth.uid()));
create policy buildings_insert_own on public.buildings for insert to authenticated
with check (user_id = (select auth.uid()));
create policy buildings_update_own on public.buildings for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy buildings_delete_own on public.buildings for delete to authenticated
using (user_id = (select auth.uid()));

grant select, insert, update, delete on table public.buildings to authenticated;
create index if not exists buildings_user_id_idx on public.buildings(user_id) where user_id is not null;
create index if not exists buildings_builder_idx on public.buildings(builder) where builder is not null;
create index if not exists buildings_verification_idx on public.buildings(verification_status);

create table if not exists public.building_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  name text not null,
  street text not null,
  street_number text,
  neighborhood text not null,
  city text not null default 'Capão da Canoa',
  state text not null default 'RS',
  postal_code text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  source_row integer,
  cover_url text,
  cover_source_url text,
  cover_source_title text,
  builder text,
  developer text,
  construction_year integer check (construction_year between 1800 and 2200),
  delivery_year integer check (delivery_year between 1800 and 2200),
  towers integer check (towers >= 0),
  floors integer check (floors >= 0),
  total_units integer check (total_units >= 0),
  units_per_floor integer check (units_per_floor >= 0),
  elevators integer check (elevators >= 0),
  parking_spaces integer check (parking_spaces >= 0),
  bedrooms_min integer check (bedrooms_min >= 0),
  bedrooms_max integer check (bedrooms_max >= 0),
  private_area_min numeric(10,2) check (private_area_min >= 0),
  private_area_max numeric(10,2) check (private_area_max >= 0),
  amenities text[] not null default '{}',
  description text,
  website_url text,
  source_url text,
  source_title text,
  source_checked_at date,
  verification_status text not null default 'manual' check (verification_status in ('pendente', 'web', 'verificado', 'manual')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, building_id)
);

alter table public.building_overrides enable row level security;
drop policy if exists building_overrides_select_own on public.building_overrides;
drop policy if exists building_overrides_insert_own on public.building_overrides;
drop policy if exists building_overrides_update_own on public.building_overrides;
drop policy if exists building_overrides_delete_own on public.building_overrides;
create policy building_overrides_select_own on public.building_overrides for select to authenticated using (user_id = (select auth.uid()));
create policy building_overrides_insert_own on public.building_overrides for insert to authenticated with check (user_id = (select auth.uid()));
create policy building_overrides_update_own on public.building_overrides for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy building_overrides_delete_own on public.building_overrides for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.building_overrides from anon;
grant select, insert, update, delete on table public.building_overrides to authenticated;
create index if not exists building_overrides_user_id_idx on public.building_overrides(user_id);
create index if not exists building_overrides_building_id_idx on public.building_overrides(building_id);
drop trigger if exists building_overrides_set_updated_at on public.building_overrides;
create trigger building_overrides_set_updated_at before update on public.building_overrides
for each row execute function public.set_updated_at();

update public.buildings set
  city = 'Capão da Canoa',
  state = 'RS',
  postal_code = '95555-000',
  cover_url = '/buildings/via-del-mare.jpg',
  cover_source_url = 'https://www.omelhordapraia.com.br/imovel/664-apartamento-de-3-dormitorios-sacada-de-frente-predio-com-infraestrutura-apenas-3-quadras-da-praia',
  cover_source_title = 'Fachada · O Melhor da Praia',
  builder = 'Nazale Incorporadora e Construtora',
  developer = 'Nazale Incorporadora e Construtora',
  elevators = 2,
  bedrooms_min = 1,
  bedrooms_max = 3,
  private_area_min = 43.45,
  private_area_max = 119.48,
  amenities = array['Academia','Brinquedoteca','Churrasqueira','Piscina aquecida','Playground','Sala de cinema','Sala de jogos','Salão de festas','Varanda'],
  description = 'Empreendimento residencial no bairro Navegantes, a três quadras do mar, com apartamentos de 1, 2 e 3 dormitórios e infraestrutura de lazer.',
  website_url = 'https://nazale.com.br/via-del-mare/',
  source_url = 'https://nazale.com.br/via-del-mare/',
  source_title = 'Via Del Mare · Nazale',
  source_checked_at = '2026-09-28',
  verification_status = 'verificado',
  notes = 'Construtora, tipologias, áreas e lazer confirmados na página oficial. Dois elevadores confirmados em anúncio imobiliário local. Ano de construção e total de unidades ainda não foram confirmados.',
  updated_at = now()
where id = '4524831a-2ede-58a9-8d4f-e10a1a919f53';
