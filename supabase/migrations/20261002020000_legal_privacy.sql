create table if not exists public.legal_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  status text not null default 'requested' check (status in ('requested', 'in_review', 'completed', 'canceled')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.legal_consents enable row level security;
alter table public.account_deletion_requests enable row level security;

create policy legal_consents_read_own_or_admin on public.legal_consents
for select to authenticated using (user_id = (select auth.uid()) or public.is_super_admin());

create policy legal_consents_insert_own on public.legal_consents
for insert to authenticated with check (user_id = (select auth.uid()));

create policy legal_consents_manage_admin on public.legal_consents
for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy deletion_requests_read_own_or_admin on public.account_deletion_requests
for select to authenticated using (user_id = (select auth.uid()) or public.is_super_admin());

create policy deletion_requests_insert_own on public.account_deletion_requests
for insert to authenticated with check (user_id = (select auth.uid()));

create policy deletion_requests_update_own on public.account_deletion_requests
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and status = 'requested');

create policy deletion_requests_manage_admin on public.account_deletion_requests
for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create index if not exists legal_consents_user_idx on public.legal_consents(user_id);
create index if not exists deletion_requests_status_idx on public.account_deletion_requests(status, requested_at desc);

drop trigger if exists legal_consents_set_updated_at on public.legal_consents;
create trigger legal_consents_set_updated_at before update on public.legal_consents for each row execute function public.set_updated_at();
drop trigger if exists deletion_requests_set_updated_at on public.account_deletion_requests;
create trigger deletion_requests_set_updated_at before update on public.account_deletion_requests for each row execute function public.set_updated_at();

create or replace function public.capture_signup_legal_consent()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'terms_version'
    and new.raw_user_meta_data ? 'privacy_version'
    and new.raw_user_meta_data ? 'legal_accepted_at' then
    insert into public.legal_consents (user_id, terms_version, privacy_version, accepted_at)
    values (
      new.id,
      new.raw_user_meta_data ->> 'terms_version',
      new.raw_user_meta_data ->> 'privacy_version',
      (new.raw_user_meta_data ->> 'legal_accepted_at')::timestamptz
    )
    on conflict (user_id) do update set
      terms_version = excluded.terms_version,
      privacy_version = excluded.privacy_version,
      accepted_at = excluded.accepted_at;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_capture_legal_consent on auth.users;
create trigger on_auth_user_capture_legal_consent
after insert on auth.users for each row execute function public.capture_signup_legal_consent();

grant select, insert on public.legal_consents to authenticated;
grant select, insert, update on public.account_deletion_requests to authenticated;
