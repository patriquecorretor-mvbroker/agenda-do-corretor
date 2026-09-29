alter table public.market_news
  add column if not exists audiences text[] not null default array['comprador'],
  add column if not exists market_impact text not null default 'neutro',
  add column if not exists objection text not null default 'Como este cenário pode afetar minha decisão?',
  add column if not exists objection_response text not null default 'Analise a notícia completa e relacione o contexto ao objetivo do cliente, sem prometer resultado.',
  add column if not exists discovery_question text not null default 'Qual é a sua principal prioridade nesta decisão?';

alter table public.market_news drop constraint if exists market_news_market_impact_check;
alter table public.market_news add constraint market_news_market_impact_check check (market_impact in ('positivo','atenção','neutro'));
alter table public.market_news drop constraint if exists market_news_audiences_check;
alter table public.market_news add constraint market_news_audiences_check check (audiences <@ array['comprador','investidor','proprietário']::text[] and cardinality(audiences) > 0);
create index if not exists market_news_audiences_idx on public.market_news using gin(audiences);

update public.market_news set
  audiences = array['comprador','investidor','proprietário'],
  market_impact = 'positivo',
  objection = 'Será que o litoral só vende bem no verão?',
  objection_response = 'O levantamento mostra volume relevante já no primeiro semestre e concentração de negócios nas duas cidades. Isso indica atividade além da alta temporada, sem garantir valorização futura.',
  discovery_question = 'Você busca um imóvel para uso próprio, renda ou valorização no litoral?'
where source_url = 'https://www.secovi-rs.com.br/site/default.asp?ID=814330&SecaoID=494829&SubsecaoID=819354&Template=../artigosnoticias/user_exibir.asp&TroncoID=083154';

update public.market_news set
  audiences = array['comprador','investidor'],
  market_impact = 'positivo',
  objection = 'Com os juros atuais, não é melhor esperar?',
  objection_response = 'O mercado continuou avançando, mas a decisão precisa comparar produto, entrada, parcela e prazo. O dado mostra movimento, não uma promessa de ganho.',
  discovery_question = 'O que pesa mais para você hoje: entrada, parcela ou prazo de pagamento?'
where source_url = 'https://cbic.org.br/vendas-de-imoveis-avancam-54-no-primeiro-semestre-e-mcmv-registra-participacao-recorde/';

update public.market_news set
  audiences = array['comprador','investidor'],
  market_impact = 'atenção',
  objection = 'O financiamento imobiliário está impossível?',
  objection_response = 'Não necessariamente. As condições ficaram mais seletivas, por isso simulação, entrada e alternativas de parcelamento precisam ser avaliadas caso a caso.',
  discovery_question = 'Você já definiu o valor de entrada e uma parcela mensal confortável?'
where source_url = 'https://www.secovi-rs.com.br/site/default.asp?ID=549145&SecaoID=494829&SubsecaoID=819354&Template=../artigosnoticias/user_exibir.asp&TroncoID=083154';
