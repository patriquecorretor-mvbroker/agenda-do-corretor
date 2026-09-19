create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sale_id uuid,
  client text,
  property text,
  development text,
  builder text,
  sale_date date,
  vgv numeric(14,2) default 0 not null,
  total_commission_percent numeric(6,3) default 0 not null,
  gross_commission numeric(14,2) default 0 not null,
  broker_percent numeric(6,3) default 100 not null,
  broker_commission numeric(14,2) default 0 not null,
  discounts numeric(14,2) default 0 not null,
  partner_split numeric(14,2) default 0 not null,
  net_commission numeric(14,2) default 0 not null,
  installments_count integer default 1 not null check (installments_count > 0),
  first_expected_date date,
  notes text,
  status text not null default 'estimada' check (status in ('estimada', 'em negociação', 'confirmada', 'parcialmente recebida', 'recebida', 'atrasada', 'cancelada')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.commission_installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  commission_id uuid not null references public.commissions(id) on delete cascade,
  installment_number integer not null,
  due_date date not null,
  expected_amount numeric(14,2) default 0 not null,
  received_amount numeric(14,2) default 0 not null,
  received_date date,
  status text not null default 'prevista' check (status in ('prevista', 'confirmada', 'parcialmente recebida', 'recebida', 'atrasada', 'cancelada')),
  payment_method text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (commission_id, installment_number)
);

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  description text not null,
  amount numeric(14,2) not null,
  due_date date,
  paid_date date,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'recebido', 'parcial', 'atrasado', 'cancelado')),
  payment_method text,
  client_id uuid,
  property_id uuid,
  sale_id uuid,
  commission_id uuid references public.commissions(id) on delete set null,
  is_recurring boolean default false not null,
  recurrence_rule text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.financial_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  name text not null,
  is_default boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, type, name)
);

create table if not exists public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  month date not null,
  limit_amount numeric(14,2) default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, category, month)
);

create table if not exists public.financial_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.financial_transactions(id) on delete cascade,
  commission_id uuid references public.commissions(id) on delete cascade,
  file_path text not null,
  file_type text,
  notes text,
  created_at timestamptz default now() not null
);

create trigger commissions_set_updated_at
before update on public.commissions
for each row execute function public.set_updated_at();

create trigger commission_installments_set_updated_at
before update on public.commission_installments
for each row execute function public.set_updated_at();

create trigger financial_transactions_set_updated_at
before update on public.financial_transactions
for each row execute function public.set_updated_at();

create trigger financial_categories_set_updated_at
before update on public.financial_categories
for each row execute function public.set_updated_at();

create trigger monthly_budgets_set_updated_at
before update on public.monthly_budgets
for each row execute function public.set_updated_at();

alter table public.commissions enable row level security;
alter table public.commission_installments enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.financial_categories enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.financial_attachments enable row level security;

create policy "commissions_select_own" on public.commissions for select using (auth.uid() = user_id);
create policy "commissions_insert_own" on public.commissions for insert with check (auth.uid() = user_id);
create policy "commissions_update_own" on public.commissions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "commissions_delete_own" on public.commissions for delete using (auth.uid() = user_id);

create policy "commission_installments_select_own" on public.commission_installments for select using (auth.uid() = user_id);
create policy "commission_installments_insert_own" on public.commission_installments for insert with check (auth.uid() = user_id);
create policy "commission_installments_update_own" on public.commission_installments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "commission_installments_delete_own" on public.commission_installments for delete using (auth.uid() = user_id);

create policy "financial_transactions_select_own" on public.financial_transactions for select using (auth.uid() = user_id);
create policy "financial_transactions_insert_own" on public.financial_transactions for insert with check (auth.uid() = user_id);
create policy "financial_transactions_update_own" on public.financial_transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "financial_transactions_delete_own" on public.financial_transactions for delete using (auth.uid() = user_id);

create policy "financial_categories_select_own" on public.financial_categories for select using (auth.uid() = user_id);
create policy "financial_categories_insert_own" on public.financial_categories for insert with check (auth.uid() = user_id);
create policy "financial_categories_update_own" on public.financial_categories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "financial_categories_delete_own" on public.financial_categories for delete using (auth.uid() = user_id);

create policy "monthly_budgets_select_own" on public.monthly_budgets for select using (auth.uid() = user_id);
create policy "monthly_budgets_insert_own" on public.monthly_budgets for insert with check (auth.uid() = user_id);
create policy "monthly_budgets_update_own" on public.monthly_budgets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "monthly_budgets_delete_own" on public.monthly_budgets for delete using (auth.uid() = user_id);

create policy "financial_attachments_select_own" on public.financial_attachments for select using (auth.uid() = user_id);
create policy "financial_attachments_insert_own" on public.financial_attachments for insert with check (auth.uid() = user_id);
create policy "financial_attachments_update_own" on public.financial_attachments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "financial_attachments_delete_own" on public.financial_attachments for delete using (auth.uid() = user_id);

create index if not exists commissions_user_id_idx on public.commissions(user_id);
create index if not exists commissions_user_status_idx on public.commissions(user_id, status);
create index if not exists commissions_user_sale_date_idx on public.commissions(user_id, sale_date);
create index if not exists commissions_sale_id_idx on public.commissions(sale_id);

create index if not exists commission_installments_user_due_idx on public.commission_installments(user_id, due_date);
create index if not exists commission_installments_user_status_idx on public.commission_installments(user_id, status);
create index if not exists commission_installments_commission_idx on public.commission_installments(commission_id);

create index if not exists financial_transactions_user_due_idx on public.financial_transactions(user_id, due_date);
create index if not exists financial_transactions_user_status_idx on public.financial_transactions(user_id, status);
create index if not exists financial_transactions_user_type_idx on public.financial_transactions(user_id, type);
create index if not exists financial_transactions_sale_id_idx on public.financial_transactions(sale_id);
create index if not exists financial_transactions_commission_id_idx on public.financial_transactions(commission_id);
create index if not exists financial_transactions_category_idx on public.financial_transactions(user_id, category);

create index if not exists financial_categories_user_type_idx on public.financial_categories(user_id, type);
create index if not exists monthly_budgets_user_month_idx on public.monthly_budgets(user_id, month);
create index if not exists monthly_budgets_user_category_idx on public.monthly_budgets(user_id, category);
