# Agenda do Corretor

PWA mobile-first para corretores organizarem agenda, clientes, foco, financeiro, metas, arquivos e inteligência do mercado imobiliário.

## Requisitos

- Node.js 20+
- pnpm 9+
- Projeto Supabase para autenticação, banco, storage e Edge Functions

## Desenvolvimento

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

Variáveis públicas obrigatórias para produção:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
VITE_ONESIGNAL_APP_ID=
```

Nunca exponha `service_role`, segredos de webhook ou chaves privadas com o prefixo `VITE_`.

## Verificação

```bash
pnpm check:launch
```

O comando executa TypeScript, testes automatizados e build de produção. O checklist completo está em [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md).

## Banco e serviços

1. Aplique, em ordem, os arquivos de `supabase/migrations`.
2. Publique as funções de `supabase/functions`.
3. Cadastre os segredos descritos em `.env.example` diretamente no ambiente do Supabase.
4. Insira manualmente o primeiro `super_admin` em `public.app_admins`.

## Hospedagem no VPS

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://seu-projeto.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=sua-chave-publica \
  -t agenda-do-corretor .

docker run -d --name agenda-do-corretor -p 8080:80 --restart unless-stopped agenda-do-corretor
```

O container usa Nginx, fallback para rotas da aplicação e políticas de cache adequadas para PWA.

## Estado inicial

Novas contas começam vazias. Agenda, clientes, financeiro, notificações, arquivos e métricas são preenchidos apenas pelo usuário. Os catálogos públicos de edifícios e condomínios permanecem disponíveis como conteúdo estrutural.
