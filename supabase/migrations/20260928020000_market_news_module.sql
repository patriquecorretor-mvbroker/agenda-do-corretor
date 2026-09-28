create table if not exists public.market_news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  source_name text not null,
  source_url text not null unique,
  image_url text,
  published_at timestamptz not null,
  category text not null check (category in ('litoral','mercado','crédito','investimento','legislação')),
  region text not null default 'Brasil',
  relevance_score integer not null default 50 check (relevance_score between 0 and 100),
  sales_argument text not null,
  whatsapp_script text not null,
  story_headline text not null,
  story_body text not null,
  story_cta text not null,
  status text not null default 'publicada' check (status in ('rascunho','publicada','arquivada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.market_news enable row level security;
drop policy if exists market_news_read_published on public.market_news;
create policy market_news_read_published on public.market_news for select to authenticated using (status = 'publicada');
revoke all on table public.market_news from anon;
grant select on table public.market_news to authenticated;
create index if not exists market_news_published_at_idx on public.market_news(published_at desc);
create index if not exists market_news_category_idx on public.market_news(category, published_at desc);
create index if not exists market_news_relevance_idx on public.market_news(relevance_score desc, published_at desc);
drop trigger if exists market_news_set_updated_at on public.market_news;
create trigger market_news_set_updated_at before update on public.market_news for each row execute function public.set_updated_at();

create table if not exists public.market_news_user_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  news_id uuid not null references public.market_news(id) on delete cascade,
  saved boolean not null default false,
  read boolean not null default false,
  story_created_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, news_id)
);
alter table public.market_news_user_state enable row level security;
drop policy if exists market_news_state_select_own on public.market_news_user_state;
drop policy if exists market_news_state_insert_own on public.market_news_user_state;
drop policy if exists market_news_state_update_own on public.market_news_user_state;
drop policy if exists market_news_state_delete_own on public.market_news_user_state;
create policy market_news_state_select_own on public.market_news_user_state for select to authenticated using (user_id = (select auth.uid()));
create policy market_news_state_insert_own on public.market_news_user_state for insert to authenticated with check (user_id = (select auth.uid()));
create policy market_news_state_update_own on public.market_news_user_state for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy market_news_state_delete_own on public.market_news_user_state for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.market_news_user_state from anon;
grant select, insert, update, delete on table public.market_news_user_state to authenticated;
create index if not exists market_news_state_user_idx on public.market_news_user_state(user_id, saved, read);
drop trigger if exists market_news_state_set_updated_at on public.market_news_user_state;
create trigger market_news_state_set_updated_at before update on public.market_news_user_state for each row execute function public.set_updated_at();

create table if not exists public.market_news_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  delivery_time time not null default '07:30',
  categories text[] not null default array['litoral','mercado','crédito','investimento'],
  regions text[] not null default array['Litoral Norte/RS','Rio Grande do Sul','Brasil'],
  push_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.market_news_settings enable row level security;
drop policy if exists market_news_settings_select_own on public.market_news_settings;
drop policy if exists market_news_settings_insert_own on public.market_news_settings;
drop policy if exists market_news_settings_update_own on public.market_news_settings;
drop policy if exists market_news_settings_delete_own on public.market_news_settings;
create policy market_news_settings_select_own on public.market_news_settings for select to authenticated using (user_id = (select auth.uid()));
create policy market_news_settings_insert_own on public.market_news_settings for insert to authenticated with check (user_id = (select auth.uid()));
create policy market_news_settings_update_own on public.market_news_settings for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy market_news_settings_delete_own on public.market_news_settings for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.market_news_settings from anon;
grant select, insert, update, delete on table public.market_news_settings to authenticated;
drop trigger if exists market_news_settings_set_updated_at on public.market_news_settings;
create trigger market_news_settings_set_updated_at before update on public.market_news_settings for each row execute function public.set_updated_at();

insert into public.market_news (title,summary,source_name,source_url,published_at,category,region,relevance_score,sales_argument,whatsapp_script,story_headline,story_body,story_cta)
values
('Capão da Canoa e Xangri-Lá concentram 54% das vendas do Litoral Norte','O Litoral Norte movimentou R$ 3,74 bilhões no primeiro semestre de 2026. Capão da Canoa e Xangri-Lá responderam juntas por cerca de 54% das vendas da região.','SECOVI/RS','https://www.secovi-rs.com.br/site/default.asp?ID=814330&SecaoID=494829&SubsecaoID=819354&Template=../artigosnoticias/user_exibir.asp&TroncoID=083154','2026-08-11 12:00:00-03','litoral','Litoral Norte/RS',98,'Os dados reforçam que Capão da Canoa e Xangri-Lá não dependem apenas da temporada: elas concentram mais da metade do volume negociado no litoral. Para o comprador, isso sinaliza mercado ativo e maior liquidez relativa na região.','Saiu um dado importante do mercado: Capão da Canoa e Xangri-Lá concentraram 54% das vendas do Litoral Norte no primeiro semestre. Isso ajuda a entender por que imóveis bem localizados nessas cidades seguem com procura. Quer que eu te mostre opções dentro do seu perfil?','54% das vendas do litoral estão em duas cidades','Capão da Canoa e Xangri-Lá concentraram mais da metade das negociações do Litoral Norte no 1º semestre de 2026.','Quer investir onde o mercado está girando? Fale comigo.'),
('Vendas de imóveis novos avançam 5,4% no primeiro semestre','Segundo a CBIC, 226.536 unidades residenciais novas foram comercializadas no país entre janeiro e junho de 2026, alta de 5,4% sobre o mesmo período de 2025.','CBIC','https://cbic.org.br/vendas-de-imoveis-avancam-54-no-primeiro-semestre-e-mcmv-registra-participacao-recorde/','2026-08-24 12:00:00-03','mercado','Brasil',91,'Mesmo com crédito mais seletivo, o mercado nacional de imóveis novos cresceu. O dado ajuda a responder ao cliente que espera uma paralisação geral: a demanda continua existindo, mas escolhe melhor localização, produto e condição de pagamento.','A CBIC divulgou alta de 5,4% nas vendas de imóveis novos no primeiro semestre. Mesmo com juros elevados, bons produtos continuam encontrando comprador. Posso separar opções com melhor relação entre localização, condição e potencial de valorização para você.','Mercado de imóveis novos cresce 5,4%','Foram 226 mil unidades vendidas no Brasil no primeiro semestre de 2026, segundo a CBIC.','O melhor momento começa com a escolha certa.'),
('Crédito para média e alta renda passa por ajustes no novo modelo','Instituições financeiras discutem ajustes nas regras do crédito imobiliário para compradores de média e alta renda, em um cenário de juros ainda elevados.','SECOVI/RS','https://www.secovi-rs.com.br/site/default.asp?ID=549145&SecaoID=494829&SubsecaoID=819354&Template=../artigosnoticias/user_exibir.asp&TroncoID=083154','2026-09-08 12:00:00-03','crédito','Brasil',86,'A notícia não significa falta total de crédito. Ela mostra que simulação e estratégia de pagamento ganharam importância. O corretor pode comparar financiamento, entrada, parcelamento direto e negociação para encontrar a estrutura mais adequada ao cliente.','As regras do crédito imobiliário estão passando por ajustes, principalmente para média e alta renda. Antes de descartar uma compra, vale comparar entrada, financiamento e parcelamento direto. Posso montar essa leitura com você e buscar imóveis compatíveis.','Crédito mudou. Estratégia virou diferencial.','Com juros altos e novas regras, comparar formas de pagamento ficou ainda mais importante na compra do imóvel.','Converse com quem conhece as alternativas do mercado.')
on conflict (source_url) do nothing;
