-- Launch infrastructure for individual broker accounts.

create table if not exists public.billing_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  action text not null check (action in ('subscribe','change_plan','cancel','reactivate')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly','annual')),
  status text not null default 'pending' check (status in ('pending','processing','completed','failed','canceled')),
  provider text,
  provider_reference text,
  idempotency_key text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  appointments boolean not null default true,
  tasks boolean not null default true,
  follow_ups boolean not null default true,
  finance boolean not null default true,
  commissions boolean not null default true,
  market_news boolean not null default false,
  reminder_minutes integer not null default 30 check (reminder_minutes in (5,10,15,30,60,120,1440)),
  quiet_start time not null default '21:00',
  quiet_end time not null default '08:00',
  timezone text not null default 'America/Sao_Paulo',
  onesignal_subscription_id text,
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('appointment','task','follow_up','finance','commission','market','system')),
  title text not null check (char_length(trim(title)) between 2 and 140),
  body text not null check (char_length(trim(body)) between 2 and 500),
  target_view text,
  target_id uuid,
  scheduled_for timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  status text not null default 'pending' check (status in ('pending','sent','failed','canceled')),
  dedupe_key text not null,
  error_message text,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create table if not exists public.privacy_request_audit (
  id uuid primary key default gen_random_uuid(),
  request_id uuid,
  subject_reference text not null,
  action text not null check (action in ('requested','review_started','exported','deleted','failed','canceled')),
  actor_user_id uuid,
  detail text,
  created_at timestamptz not null default now()
);

alter table public.billing_requests enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.privacy_request_audit enable row level security;

create policy billing_requests_read_own_or_admin on public.billing_requests
for select to authenticated using (user_id = (select auth.uid()) or public.is_super_admin());
create policy billing_requests_insert_own on public.billing_requests
for insert to authenticated with check (user_id = (select auth.uid()) and status = 'pending');
create policy billing_requests_manage_admin on public.billing_requests
for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy notification_preferences_read_own on public.notification_preferences
for select to authenticated using (user_id = (select auth.uid()));
create policy notification_preferences_insert_own on public.notification_preferences
for insert to authenticated with check (user_id = (select auth.uid()));
create policy notification_preferences_update_own on public.notification_preferences
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy notifications_read_own on public.notifications
for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_update_read_state on public.notifications
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy privacy_request_audit_read_admin on public.privacy_request_audit
for select to authenticated using (public.is_super_admin());

create index if not exists billing_requests_user_status_idx on public.billing_requests(user_id, status, created_at desc);
create index if not exists notifications_user_read_idx on public.notifications(user_id, read_at, created_at desc);
create index if not exists notifications_schedule_idx on public.notifications(status, scheduled_for) where status = 'pending';
create index if not exists privacy_request_audit_request_idx on public.privacy_request_audit(request_id, created_at desc);

drop trigger if exists billing_requests_set_updated_at on public.billing_requests;
create trigger billing_requests_set_updated_at before update on public.billing_requests for each row execute function public.set_updated_at();
drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at before update on public.notification_preferences for each row execute function public.set_updated_at();

grant select, insert on public.billing_requests to authenticated;
grant update on public.billing_requests to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select, update (read_at) on public.notifications to authenticated;
grant select on public.privacy_request_audit to authenticated;

-- This product serves individual brokers. The legacy team offer is kept for history only.
update public.subscription_plans set active = false where slug = 'equipe';

-- Commission value is entered ready by the broker. Percentage fields remain for backwards compatibility.
comment on column public.commissions.net_commission is 'Final commission amount entered by the broker; this is the financial source of truth.';
comment on column public.commissions.vgv is 'Optional reference value. It must not be used to automatically calculate commission.';
