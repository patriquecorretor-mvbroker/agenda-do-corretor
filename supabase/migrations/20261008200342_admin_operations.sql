create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;

create policy admin_audit_logs_read_admin
on public.admin_audit_logs for select to authenticated
using (public.is_super_admin());

create index if not exists admin_audit_logs_created_idx
on public.admin_audit_logs(created_at desc);

create index if not exists admin_audit_logs_entity_idx
on public.admin_audit_logs(entity_type, entity_id, created_at desc);

grant select on public.admin_audit_logs to authenticated;

create or replace function public.capture_admin_operation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  entity_value text;
  operation_summary text;
  details jsonb := '{}'::jsonb;
begin
  if not public.is_super_admin() then
    return new;
  end if;

  entity_value := coalesce(new.id::text, old.id::text);

  if tg_table_name = 'subscriptions' then
    operation_summary := 'Acesso ou plano do assinante atualizado';
    details := jsonb_build_object('status_before', old.status, 'status_after', new.status, 'plan_before', old.plan_id, 'plan_after', new.plan_id);
  elsif tg_table_name = 'subscription_payments' then
    operation_summary := 'Status de cobrança atualizado';
    details := jsonb_build_object('status_before', old.status, 'status_after', new.status, 'amount', new.amount);
  elsif tg_table_name = 'subscription_plans' then
    operation_summary := 'Plano comercial atualizado';
    details := jsonb_build_object('name', new.name, 'active', new.active, 'monthly_price', new.monthly_price);
  elsif tg_table_name = 'admin_materials' then
    operation_summary := case when tg_op = 'INSERT' then 'Material administrativo criado' else 'Publicação de material atualizada' end;
    details := jsonb_build_object('title', new.title, 'published', new.published, 'category', new.category);
  elsif tg_table_name = 'billing_requests' then
    operation_summary := 'Solicitação de cobrança atualizada';
    details := jsonb_build_object('status_before', old.status, 'status_after', new.status, 'action', new.action);
  elsif tg_table_name = 'admin_giveaway_draws' then
    operation_summary := 'Sorteio de assinantes realizado';
    details := jsonb_build_object('winner', new.winner_name, 'prize', new.prize_title, 'participants', new.participant_count);
  elsif tg_table_name = 'account_deletion_requests' then
    operation_summary := 'Solicitação de privacidade atualizada';
    details := jsonb_build_object('status_before', old.status, 'status_after', new.status);
  else
    operation_summary := 'Operação administrativa registrada';
  end if;

  insert into public.admin_audit_logs (actor_user_id, action, entity_type, entity_id, summary, metadata)
  values ((select auth.uid()), lower(tg_op), tg_table_name, entity_value, operation_summary, details);

  return new;
end;
$$;

drop trigger if exists audit_subscriptions_admin on public.subscriptions;
create trigger audit_subscriptions_admin after update on public.subscriptions for each row execute function public.capture_admin_operation();
drop trigger if exists audit_subscription_payments_admin on public.subscription_payments;
create trigger audit_subscription_payments_admin after update on public.subscription_payments for each row execute function public.capture_admin_operation();
drop trigger if exists audit_subscription_plans_admin on public.subscription_plans;
create trigger audit_subscription_plans_admin after update on public.subscription_plans for each row execute function public.capture_admin_operation();
drop trigger if exists audit_admin_materials_admin on public.admin_materials;
create trigger audit_admin_materials_admin after insert or update on public.admin_materials for each row execute function public.capture_admin_operation();
drop trigger if exists audit_billing_requests_admin on public.billing_requests;
create trigger audit_billing_requests_admin after update on public.billing_requests for each row execute function public.capture_admin_operation();
drop trigger if exists audit_admin_giveaways_admin on public.admin_giveaway_draws;
create trigger audit_admin_giveaways_admin after insert on public.admin_giveaway_draws for each row execute function public.capture_admin_operation();
drop trigger if exists audit_account_deletion_requests_admin on public.account_deletion_requests;
create trigger audit_account_deletion_requests_admin after update on public.account_deletion_requests for each row execute function public.capture_admin_operation();
