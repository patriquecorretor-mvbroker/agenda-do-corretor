create table if not exists public.admin_giveaway_draws (
  id uuid primary key default gen_random_uuid(),
  winner_user_id uuid references auth.users(id) on delete set null,
  winner_name text not null check (char_length(trim(winner_name)) between 2 and 180),
  winner_email text,
  winner_city text,
  winner_plan_name text,
  prize_title text not null check (char_length(trim(prize_title)) between 2 and 180),
  prize_description text,
  participant_count integer not null check (participant_count >= 2),
  participant_user_ids uuid[] not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  drawn_at timestamptz not null default now()
);

alter table public.admin_giveaway_draws enable row level security;

create policy admin_giveaway_draws_read_admin
on public.admin_giveaway_draws for select to authenticated
using (public.is_super_admin());

create policy admin_giveaway_draws_insert_admin
on public.admin_giveaway_draws for insert to authenticated
with check (public.is_super_admin() and created_by = (select auth.uid()));

create policy admin_giveaway_draws_delete_admin
on public.admin_giveaway_draws for delete to authenticated
using (public.is_super_admin());

create index if not exists admin_giveaway_draws_drawn_at_idx
on public.admin_giveaway_draws(drawn_at desc);

grant select, insert, delete on public.admin_giveaway_draws to authenticated;
