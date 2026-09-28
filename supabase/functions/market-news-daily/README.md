# Radar diário de notícias

Secrets necessárias no projeto Supabase:

- `OPENAI_API_KEY`: usada apenas na Edge Function.
- `OPENAI_MODEL`: opcional; padrão `gpt-4.1-mini`.
- `MARKET_NEWS_CRON_SECRET`: segredo aleatório enviado pelo agendamento.

Agende `market-news-daily` diariamente no painel Supabase em `Integrations > Cron`, por exemplo às `10:30 UTC` (`07:30` em Brasília). Envie o segredo no header `x-cron-secret`. A função também aceita atualização manual feita por um usuário autenticado.

Nunca coloque as chaves no frontend ou em variáveis `VITE_*`.
