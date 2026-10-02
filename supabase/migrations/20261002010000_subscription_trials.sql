update public.subscription_plans
set features = case slug
  when 'essencial' then array['Agenda','Clientes','Foco','Materiais','Meus Arquivos']
  when 'profissional' then array['Agenda','Clientes','Foco','Materiais','Meus Arquivos','Financeiro','Metas','Edifícios','Condomínios','Mercado','Mídia da Cidade']
  when 'equipe' then array['Agenda','Clientes','Foco','Materiais','Meus Arquivos','Financeiro','Metas','Edifícios','Condomínios','Mercado','Mídia da Cidade','Gestão de equipe','Suporte prioritário']
  else features
end
where slug in ('essencial','profissional','equipe');

create or replace function public.create_trial_subscription_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_plan_id uuid;
begin
  select id into default_plan_id
  from public.subscription_plans
  where slug = 'essencial' and active
  limit 1;

  if default_plan_id is not null then
    insert into public.subscriptions (
      user_id,
      plan_id,
      status,
      billing_cycle,
      trial_ends_at,
      current_period_start,
      current_period_end
    ) values (
      new.id,
      default_plan_id,
      'trialing',
      'monthly',
      now() + interval '14 days',
      now(),
      now() + interval '14 days'
    ) on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists create_trial_subscription_after_signup on auth.users;
create trigger create_trial_subscription_after_signup
after insert on auth.users
for each row execute function public.create_trial_subscription_for_user();

insert into public.subscriptions (
  user_id,
  plan_id,
  status,
  billing_cycle,
  trial_ends_at,
  current_period_start,
  current_period_end
)
select
  users.id,
  plans.id,
  'trialing',
  'monthly',
  now() + interval '14 days',
  now(),
  now() + interval '14 days'
from auth.users users
cross join lateral (
  select id from public.subscription_plans where slug = 'essencial' and active limit 1
) plans
where not exists (select 1 from public.subscriptions subscriptions where subscriptions.user_id = users.id)
on conflict (user_id) do nothing;
