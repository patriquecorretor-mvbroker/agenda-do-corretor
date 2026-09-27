alter table public.clients
  add column if not exists payment_condition text;

create index if not exists clients_user_payment_condition_idx
  on public.clients(user_id, payment_condition)
  where payment_condition is not null;
