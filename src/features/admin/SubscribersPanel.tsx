import { useMemo, useState } from "react";
import { Download, Mail, MapPin, Phone, Search, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { subscribersCsv } from "./admin-export";
import type { SaasBillingRequest, SaasMember, SaasPayment, SaasPlan } from "./use-saas-admin";

type Status = SaasMember["status"] | "all";

export function SubscribersPanel({ members, plans, payments, requests, onUpdate }: {
  members: SaasMember[];
  plans: SaasPlan[];
  payments: SaasPayment[];
  requests: SaasBillingRequest[];
  onUpdate: (member: SaasMember, input: Partial<Pick<SaasMember, "status" | "plan_id">>) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [planId, setPlanId] = useState("all");
  const [selected, setSelected] = useState<SaasMember | null>(null);
  const visible = useMemo(() => members.filter((member) => {
    const term = `${member.name} ${member.email} ${member.city} ${member.creci ?? ""} ${member.company ?? ""}`.toLowerCase();
    return term.includes(search.toLowerCase()) && (status === "all" || member.status === status) && (planId === "all" || member.plan_id === planId);
  }), [members, planId, search, status]);

  function exportVisible() {
    const blob = new Blob(["\ufeff", subscribersCsv(visible, plans)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `assinantes-agenda-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div className="space-y-4">
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Summary label="Base total" value={members.length} />
      <Summary label="Ativos" value={members.filter((item) => item.status === "active").length} positive />
      <Summary label="Em teste" value={members.filter((item) => item.status === "trialing").length} />
      <Summary label="Exigem atenção" value={members.filter((item) => ["past_due", "suspended"].includes(item.status)).length} attention />
    </section>
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="border-b p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Assinantes e controle de acesso</h2><p className="text-xs text-muted-foreground">Consulte a ficha, troque o plano e controle o acesso.</p></div><Button variant="outline" onClick={exportVisible} disabled={!visible.length}><Download className="h-4 w-4" />Exportar CSV</Button></div>
        <div className="mt-4 grid gap-2 lg:grid-cols-[minmax(240px,1fr)_190px_190px]">
          <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, e-mail, cidade, CRECI ou empresa" className="pl-9" /></label>
          <select value={status} onChange={(event) => setStatus(event.target.value as Status)} className="h-12 rounded-2xl border bg-background px-3 text-sm"><option value="all">Todos os acessos</option><option value="trialing">Em teste</option><option value="active">Ativos</option><option value="past_due">Inadimplentes</option><option value="suspended">Suspensos</option><option value="canceled">Cancelados</option></select>
          <select value={planId} onChange={(event) => setPlanId(event.target.value)} className="h-12 rounded-2xl border bg-background px-3 text-sm"><option value="all">Todos os planos</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select>
        </div>
      </div>
      <div className="divide-y">{visible.length ? visible.map((member) => <SubscriberRow key={member.id} member={member} plans={plans} onOpen={() => setSelected(member)} onUpdate={onUpdate} />) : <div className="p-10 text-center text-sm text-muted-foreground">Nenhum assinante encontrado com esses filtros.</div>}</div>
    </section>
    <SubscriberDialog member={selected} plan={plans.find((plan) => plan.id === selected?.plan_id)} payments={payments.filter((item) => item.user_id === selected?.user_id)} requests={requests.filter((item) => item.user_id === selected?.user_id)} onClose={() => setSelected(null)} />
  </div>;
}

function SubscriberRow({ member, plans, onOpen, onUpdate }: { member: SaasMember; plans: SaasPlan[]; onOpen: () => void; onUpdate: (member: SaasMember, input: Partial<Pick<SaasMember, "status" | "plan_id">>) => Promise<void> }) {
  return <div className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_160px_120px_150px] md:items-center">
    <button type="button" onClick={onOpen} className="flex min-w-0 items-center gap-3 text-left"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">{initials(member.name)}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{member.name}</span><span className="block truncate text-xs text-muted-foreground">{member.email} · {member.city}</span><span className="mt-1 block text-[10px] text-muted-foreground">Renova {formatDate(member.renewal)}</span></span></button>
    <label className="grid gap-1 text-[9px] font-bold uppercase text-muted-foreground">Plano<select value={member.plan_id} onChange={(event) => void onUpdate(member, { plan_id: event.target.value })} className="h-10 rounded-xl border bg-background px-3 text-xs font-semibold normal-case text-foreground">{plans.filter((item) => item.active || item.id === member.plan_id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <StatusPill status={member.status} />
    <label className="grid gap-1 text-[9px] font-bold uppercase text-muted-foreground">Acesso<select value={member.status} onChange={(event) => void onUpdate(member, { status: event.target.value as SaasMember["status"] })} className="h-10 rounded-xl border bg-background px-3 text-xs font-semibold normal-case text-foreground"><option value="trialing">Teste</option><option value="active">Ativo</option><option value="past_due">Inadimplente</option><option value="suspended">Suspenso</option><option value="canceled">Cancelado</option></select></label>
  </div>;
}

function SubscriberDialog({ member, plan, payments, requests, onClose }: { member: SaasMember | null; plan?: SaasPlan; payments: SaasPayment[]; requests: SaasBillingRequest[]; onClose: () => void }) {
  if (!member) return null;
  const paid = payments.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0);
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle className="pr-8">{member.name}</DialogTitle><DialogDescription>Ficha operacional do assinante. Os dados privados da agenda não são exibidos aqui.</DialogDescription></DialogHeader>
    <div className="grid gap-3 sm:grid-cols-2"><Info icon={Mail} label="E-mail" value={member.email} /><Info icon={Phone} label="Telefone" value={member.whatsapp || member.phone || "Não informado"} /><Info icon={MapPin} label="Cidade" value={member.city} /><Info icon={ShieldCheck} label="CRECI" value={member.creci || "Não informado"} /><Info icon={UserRound} label="Empresa" value={member.company || "Não informada"} /><Info icon={ShieldCheck} label="Plano" value={plan?.name || "Sem plano"} /></div>
    <section className="grid grid-cols-3 gap-2 rounded-2xl border bg-muted/30 p-3"><MiniMetric label="Status" value={statusLabel(member.status)} /><MiniMetric label="Total pago" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(paid)} /><MiniMetric label="Solicitações" value={String(requests.length)} /></section>
    <section><h3 className="text-sm font-semibold">Linha do tempo da assinatura</h3><div className="mt-3 space-y-2"><Timeline title="Conta cadastrada" date={member.created_at} />{member.renewal && <Timeline title="Próxima renovação" date={`${member.renewal}T12:00:00`} />}{requests.slice(0, 4).map((request) => <Timeline key={request.id} title={`Solicitação: ${request.action.replace("_", " ")}`} date={request.created_at} />)}{payments.slice(0, 4).map((payment) => <Timeline key={payment.id} title={`Cobrança ${statusLabel(payment.status)}`} date={`${payment.due_date}T12:00:00`} />)}</div></section>
  </DialogContent></Dialog>;
}

function Summary({ label, value, positive, attention }: { label: string; value: number; positive?: boolean; attention?: boolean }) { return <article className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={cn("mt-2 text-2xl font-semibold", positive && "text-emerald-600", attention && value > 0 && "text-destructive")}>{value}</p></article>; }
function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) { return <div className="rounded-xl border p-3"><p className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</p><p className="mt-2 break-words text-sm font-semibold">{value}</p></div>; }
function MiniMetric({ label, value }: { label: string; value: string }) { return <div className="min-w-0 text-center"><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-1 truncate text-xs font-semibold">{value}</p></div>; }
function Timeline({ title, date }: { title: string; date: string }) { return <div className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2"><span className="text-xs font-medium capitalize">{title}</span><span className="shrink-0 text-[10px] text-muted-foreground">{new Date(date).toLocaleDateString("pt-BR")}</span></div>; }
function StatusPill({ status }: { status: string }) { return <span className={cn("w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold", ["active", "paid", "completed"].includes(status) ? "bg-emerald-500/10 text-emerald-600" : ["past_due", "overdue", "suspended", "failed"].includes(status) ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>{statusLabel(status)}</span>; }
function statusLabel(status: string) { return ({ active: "Ativo", trialing: "Em teste", past_due: "Inadimplente", suspended: "Suspenso", canceled: "Cancelado", paid: "Pago", pending: "Pendente", overdue: "Atrasado", refunded: "Estornado", failed: "Falhou", completed: "Concluído" } as Record<string, string>)[status] ?? status; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?"; }
function formatDate(value: string) { return value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—"; }
