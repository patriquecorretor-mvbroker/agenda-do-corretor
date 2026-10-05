# Checklist de lançamento

## Auditoria local de 5 de outubro de 2026

- `pnpm check:launch` aprovado: TypeScript, 21 testes e build de produção.
- 16 módulos percorridos no desktop e no viewport mobile de 390 x 844, sem tela branca, erro de console ou rolagem horizontal da página.
- Cadastro rápido de tarefa validado com persistência no modo demonstração.
- Despesa paga validada no fluxo real: o lançamento alterou despesas e resultado líquido; conta pendente permanece fora do caixa realizado.
- PWA validado com manifest standalone, atalhos, ícones 192/512 nas dimensões corretas, service worker e fallback offline presentes.
- Auditoria estática aprovada para 33 tabelas públicas com RLS e policies.
- Auditoria de dependências aprovada sem vulnerabilidades conhecidas em produção.
- Pacote inicial reduzido de aproximadamente 686 kB para 156 kB por divisão de módulos e fornecedores.
- Recuperação de senha concluída com tela de definição e confirmação da nova senha.

**Decisão:** o produto está pronto para homologação interna e demonstração. A venda para assinantes depende dos itens externos abaixo, sobretudo Supabase de produção, cobrança real, identidade legal, e-mail e push.

## Pronto no código

- PWA instalável, manifest, ícones, service worker e fallback offline.
- Modo demonstração sem servidor para validar os principais fluxos.
- Autenticação e isolamento por usuário preparados para Supabase.
- Termos de Uso, Política de Privacidade e aceite versionado no cadastro.
- Exportação dos dados da conta e solicitação de exclusão.
- Super Admin com assinantes, planos, cobranças e distribuição de materiais.
- Área Minha assinatura com planos individuais, histórico e solicitações idempotentes de troca/reativação.
- Central de notificações no app, preferências por assunto, horário silencioso e integração OneSignal preparada.
- Processamento administrativo de exclusão real da conta com trilha técnica de auditoria.
- Métricas comerciais com deduplicação de contatos e separação entre comissão potencial e confirmada.
- Upload privado de imagem, vídeo e PDF no bucket `saas-materials`.
- Migrations com RLS, índices, políticas e storage privado.
- Testes automatizados, verificação de tipos e build de produção.

## Configuração externa antes da venda

1. Criar ou selecionar o projeto Supabase de produção.
2. Preencher `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente de publicação.
3. Aplicar todas as migrations da pasta `supabase/migrations` em ordem.
4. Inserir o primeiro usuário em `app_admins` como `super_admin`.
5. Confirmar e-mail, URLs de redirecionamento e domínio autorizado no Supabase Auth.
6. Escolher o provedor de pagamentos e ligar checkout/webhook às solicitações de cobrança já registradas.
7. Criar o aplicativo Web Push no OneSignal e preencher `VITE_ONESIGNAL_APP_ID`.
8. Publicar as Edge Functions e cadastrar os segredos de IA, notícias e OneSignal.
9. Agendar `send-notifications` a cada cinco minutos no Supabase Cron.
10. Configurar remetente de e-mail transacional e canal de suporte.
11. Definir backups, retenção, alertas de erro e monitoramento de disponibilidade.

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
- Ativar push por gesto do usuário e validar compromisso, tarefa, follow-up, conta e comissão em dispositivo real.
- Verificar o PWA instalado em iPhone e Android reais.
- Fazer teste de restauração de backup antes da abertura comercial.

## Regra de lançamento

Não considerar pagamentos, IA, notícias automáticas ou sincronização em nuvem como ativos até os respectivos serviços externos estarem configurados e homologados. O modo demonstração é apenas para avaliação local do produto.
