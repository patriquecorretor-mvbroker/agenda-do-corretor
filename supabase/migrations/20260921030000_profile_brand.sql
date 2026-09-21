alter table public.profiles
  add column if not exists logo text,
  add column if not exists nome_marca text;

comment on column public.profiles.logo is 'URL ou imagem da marca usada nas artes do corretor.';
comment on column public.profiles.nome_marca is 'Nome comercial exibido nas artes e na identidade do corretor.';
