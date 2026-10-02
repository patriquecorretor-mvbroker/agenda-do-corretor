# Checklist de lançamento

## Pronto no código

- PWA instalável, manifest, ícones, service worker e fallback offline.
- Modo demonstração sem servidor para validar os principais fluxos.
- Autenticação e isolamento por usuário preparados para Supabase.
- Termos de Uso, Política de Privacidade e aceite versionado no cadastro.
- Exportação dos dados da conta e solicitação de exclusão.
- Super Admin com assinantes, planos, cobranças e distribuição de materiais.
- Upload privado de imagem, vídeo e PDF no bucket `saas-materials`.
- Migrations com RLS, índices, políticas e storage privado.
- Testes automatizados, verificação de tipos e build de produção.

## Configuração externa antes da venda

1. Criar ou selecionar o projeto Supabase de produção.
2. Preencher `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente de publicação.
3. Aplicar todas as migrations da pasta `supabase/migrations` em ordem.
4. Inserir o primeiro usuário em `app_admins` como `super_admin`.
5. Confirmar e-mail, URLs de redirecionamento e domínio autorizado no Supabase Auth.
6. Escolher o provedor de pagamentos e implementar checkout e webhook assinado.
7. Publicar as Edge Functions e cadastrar os segredos de IA e notícias.
8. Configurar remetente de e-mail transacional e canal de suporte.
9. Definir backups, retenção, alertas de erro e monitoramento de disponibilidade.

## Informações legais a preencher

- Razão social ou nome do responsável.
- CNPJ ou CPF aplicável.
- Endereço comercial.
- E-mail definitivo de suporte e privacidade.
- Regras comerciais dos planos, teste, renovação, cancelamento e reembolso.

## Homologação com servidor conectado

- Criar conta, confirmar e-mail, entrar, recuperar senha e sair.
- Validar onboarding e dados em outro dispositivo.
- Confirmar RLS com dois usuários distintos e um Super Admin.
- Subir e baixar materiais de cada tipo e plano.
- Simular pagamento aprovado, recusado, vencido, cancelado e estornado.
- Testar solicitação de exclusão e processamento administrativo.
- Verificar o PWA instalado em iPhone e Android reais.
- Fazer teste de restauração de backup antes da abertura comercial.

## Regra de lançamento

Não considerar pagamentos, IA, notícias automáticas ou sincronização em nuvem como ativos até os respectivos serviços externos estarem configurados e homologados. O modo demonstração é apenas para avaliação local do produto.
