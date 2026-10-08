import { BellRing, CheckCircle2, Cloud, CreditCard, Database, HardDriveUpload, History, ShieldCheck, Smartphone, TriangleAlert } from "lucide-react";
import { hasSupabaseConfig } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { AdminAuditLog, SaasMember } from "./use-saas-admin";

export function OperationsPanel({ members, logs }: { members: SaasMember[]; logs: AdminAuditLog[] }) {
  const pushReady = Boolean(import.meta.env.VITE_ONESIGNAL_APP_ID);
  const billingReady = members.some((member) => Boolean(member.provider));
  const pwaReady = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const integrations = [
    { icon: Database, name: "Banco e autenticação", detail: hasSupabaseConfig ? "Configuração encontrada neste ambiente" : "Aguardando banco da VPS", ready: hasSupabaseConfig },
    { icon: HardDriveUpload, name: "Arquivos e imagens", detail: hasSupabaseConfig ? "Storage preparado para uploads privados" : "Uploads permanecem neste navegador", ready: hasSupabaseConfig },
    { icon: BellRing, name: "Notificações push", detail: pushReady ? "OneSignal configurado" : "Aguardando App ID e chaves do servidor", ready: pushReady },
    { icon: CreditCard, name: "Cobrança automática", detail: billingReady ? "Provedor associado a assinaturas" : "Aguardando gateway e webhooks", ready: billingReady },
    { icon: Smartphone, name: "Aplicativo PWA", detail: pwaReady ? "Instalação e service worker suportados" : "Navegador sem service worker", ready: pwaReady }
  ];
  const readyCount = integrations.filter((item) => item.ready).length;

  return <div className="space-y-4">
    <section className="overflow-hidden rounded-2xl border bg-foreground p-5 text-background shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-primary"><Cloud className="h-4 w-4" />Centro operacional</p><h2 className="mt-2 text-2xl font-semibold">Saúde do sistema</h2><p className="mt-1 max-w-2xl text-sm text-background/55">Este painel diferencia o que já está operacional do que ainda precisa de infraestrutura externa.</p></div><span className="rounded-full border border-background/15 bg-background/5 px-3 py-2 text-xs font-semibold">{readyCount} de {integrations.length} integrações prontas</span></div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-background/10"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${readyCount * 100 / integrations.length}%` }} /></div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{integrations.map((item) => <article key={item.name} className="rounded-2xl border bg-card p-4"><div className="flex items-start gap-3"><span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", item.ready ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-700 dark:text-amber-400")}><item.icon className="h-5 w-5" /></span><div><div className="flex items-center gap-2"><h3 className="text-sm font-semibold">{item.name}</h3>{item.ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <TriangleAlert className="h-4 w-4 text-amber-600" />}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p></div></div></article>)}</section>

    <section className="rounded-2xl border bg-card">
      <div className="flex items-center gap-3 border-b p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><History className="h-5 w-5" /></span><div><h2 className="font-semibold">Histórico administrativo</h2><p className="text-xs text-muted-foreground">Alterações de acesso, cobrança, planos, materiais e sorteios.</p></div></div>
      {logs.length ? <div className="divide-y">{logs.slice(0, 40).map((log) => <div key={log.id} className="flex items-start gap-3 p-4"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted"><ShieldCheck className="h-4 w-4 text-muted-foreground" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{log.summary}</p><p className="mt-1 truncate text-xs text-muted-foreground">{entityLabel(log.entity_type)}{log.entity_id ? ` · ${log.entity_id}` : ""}</p></div><time className="shrink-0 text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString("pt-BR")}</time></div>)}</div> : <div className="p-10 text-center text-sm text-muted-foreground">As próximas ações administrativas aparecerão aqui.</div>}
    </section>
  </div>;
}

function entityLabel(entity: string) {
  return ({ subscriptions: "Assinatura", subscription_payments: "Cobrança", subscription_plans: "Plano", admin_materials: "Material", billing_requests: "Solicitação", admin_giveaway_draws: "Sorteio", account_deletion_requests: "Privacidade" } as Record<string, string>)[entity] ?? entity;
}
