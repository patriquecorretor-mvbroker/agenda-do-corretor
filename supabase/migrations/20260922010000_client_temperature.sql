alter table public.clients
  add column if not exists temperature text
  check (temperature in ('quente', 'morno', 'frio'));

create index if not exists clients_user_temperature_idx
  on public.clients(user_id, temperature);
