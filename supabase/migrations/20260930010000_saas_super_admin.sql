create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'super_admin' check (role = 'super_admin'),
  created_at timestamptz not null default now()
);

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.app_admins where user_id = (select auth.uid()) and role = 'super_admin') $$;

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  monthly_price numeric(12,2) not null default 0 check (monthly_price >= 0),
  annual_price numeric(12,2) not null default 0 check (annual_price >= 0),
  features text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  status text not null default 'trialing' check (status in ('trialing','active','past_due','suspended','canceled')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly','annual')),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date not null,
  paid_at timestamptz,
  status text not null default 'pending' check (status in ('pending','paid','overdue','refunded','canceled')),
  payment_method text,
  provider_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 180),
  description text,
  category text not null,
  material_type text not null check (material_type in ('image','video','pdf','drive','link')),
  thumbnail_url text,
  external_url text,
  storage_path text,
  target_plan_ids uuid[] not null default '{}',
  published boolean not null default false,
  published_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (external_url is not null or storage_path is not null)
);

alter table public.app_admins enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_payments enable row level security;
alter table public.admin_materials enable row level security;

create policy app_admins_read_self on public.app_admins for select to authenticated using (user_id = (select auth.uid()) or public.is_super_admin());
create policy app_admins_manage_admin on public.app_admins for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy plans_read_active on public.subscription_plans for select to authenticated using (active or public.is_super_admin());
create policy plans_manage_admin on public.subscription_plans for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy subscriptions_read_own_or_admin on public.subscriptions for select to authenticated using (user_id = (select auth.uid()) or public.is_super_admin());
create policy subscriptions_manage_admin on public.subscriptions for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy payments_read_own_or_admin on public.subscription_payments for select to authenticated using (user_id = (select auth.uid()) or public.is_super_admin());
create policy payments_manage_admin on public.subscription_payments for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy materials_read_published_or_admin on public.admin_materials for select to authenticated using (
  public.is_super_admin()
  or (
    published
    and (
      cardinality(target_plan_ids) = 0
      or exists (select 1 from public.subscriptions s where s.user_id = (select auth.uid()) and s.plan_id = any(target_plan_ids) and s.status in ('trialing','active','past_due'))
    )
  )
);
create policy materials_manage_admin on public.admin_materials for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy profiles_select_admin on public.profiles for select to authenticated using (public.is_super_admin());

create index if not exists subscriptions_status_idx on public.subscriptions(status);
create index if not exists subscriptions_plan_idx on public.subscriptions(plan_id);
create index if not exists subscription_payments_user_status_idx on public.subscription_payments(user_id, status);
create index if not exists subscription_payments_due_idx on public.subscription_payments(due_date, status);
create index if not exists admin_materials_published_idx on public.admin_materials(published, created_at desc);
create index if not exists admin_materials_category_idx on public.admin_materials(category);

drop trigger if exists subscription_plans_set_updated_at on public.subscription_plans;
create trigger subscription_plans_set_updated_at before update on public.subscription_plans for each row execute function public.set_updated_at();
drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
drop trigger if exists subscription_payments_set_updated_at on public.subscription_payments;
create trigger subscription_payments_set_updated_at before update on public.subscription_payments for each row execute function public.set_updated_at();
drop trigger if exists admin_materials_set_updated_at on public.admin_materials;
create trigger admin_materials_set_updated_at before update on public.admin_materials for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('saas-materials', 'saas-materials', false, 250000000, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy saas_materials_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'saas-materials' and public.is_super_admin());
create policy saas_materials_admin_update on storage.objects for update to authenticated using (bucket_id = 'saas-materials' and public.is_super_admin()) with check (bucket_id = 'saas-materials' and public.is_super_admin());
create policy saas_materials_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'saas-materials' and public.is_super_admin());
create policy saas_materials_subscriber_select on storage.objects for select to authenticated using (
  bucket_id = 'saas-materials'
  and exists (
    select 1 from public.admin_materials m
    where m.storage_path = name
      and m.published
      and (
        cardinality(m.target_plan_ids) = 0
        or exists (select 1 from public.subscriptions s where s.user_id = (select auth.uid()) and s.plan_id = any(m.target_plan_ids) and s.status in ('trialing','active','past_due'))
      )
  )
);

grant select on public.subscription_plans, public.subscriptions, public.subscription_payments, public.admin_materials, public.app_admins to authenticated;
grant insert, update, delete on public.subscription_plans, public.subscriptions, public.subscription_payments, public.admin_materials to authenticated;

insert into public.subscription_plans (name, slug, description, monthly_price, annual_price, features)
values
  ('Essencial', 'essencial', 'Agenda, clientes e foco comercial.', 49.90, 499.00, array['Agenda completa','CRM de clientes','Módulo Foco','Biblioteca de materiais']),
  ('Profissional', 'profissional', 'Gestão comercial e financeira completa.', 89.90, 899.00, array['Tudo do Essencial','Financeiro completo','Relatórios e metas','Edifícios e condomínios']),
  ('Equipe', 'equipe', 'Operação para imobiliárias e times.', 169.90, 1699.00, array['Tudo do Profissional','Gestão de equipe','Conteúdo centralizado','Suporte prioritário'])
on conflict (slug) do nothing;
