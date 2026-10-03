# Notificações agendadas

Configure os segredos somente no servidor:

- `ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`
- `NOTIFICATIONS_CRON_SECRET`
- `APP_PUBLIC_URL`

No frontend, configure apenas `VITE_ONESIGNAL_APP_ID`.

Depois de publicar a função, agende uma chamada a cada cinco minutos pelo Supabase Cron enviando o cabeçalho `x-cron-secret`. A função cria uma notificação idempotente antes de chamar o OneSignal, respeita as preferências e o horário silencioso do corretor.
