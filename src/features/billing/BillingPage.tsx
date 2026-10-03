import { useState } from "react";
import { ArrowLeft, Check, CircleDollarSign, Clock3, CreditCard, Loader2, ReceiptText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useBilling, type BillingCycle } from "./use-billing";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function BillingPage({ onBack }: { onBack?: () => void }) {
  const billing = useBilling();
  const { toast } = useToast();
  const [cycle, setCycle] = useState<BillingCycle>(billing.data.subscription?.billing_cycle ?? "monthly");
  const currentPlanId = billing.data.subscription?.plan_id;
  const pending = billing.data.requests.find((request) => ["pending", "processing"].includes(request.status));

  async function requestPlan(planId: string) {
    const action = billing.data.subscription?.status === "canceled" ? "reactivate" : currentPlanId ? "change_plan" : "subscribe";
    try {
      await billing.createRequest.mutateAsync({ action, planId, billingCycle: cycle });
      toast({ title: billing.data.providerReady ? "Solicitação enviada para processamento." : "Solicitação salva. A cobrança será concluída quando o provedor estiver conectado." });
    } catch (error) { toast({ title: error instanceof Error ? error.message : "Não foi possível registrar a solicitação.", variant: "error" }); }
  }

  if (billing.isLoading) return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;

  return <div className="mx-auto w-full max-w-[1300px] space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-4"><div className="flex items-start gap-3">{onBack && <Button size="icon" variant="outline" onClick={onBack} aria-label="Voltar"><ArrowLeft className="h-4 w-4" /></Button>}<div><p className="text-xs font-semibold uppercase text-primary">Conta individual</p><h1 className="mt-1 text-3xl font-semibold">Minha assinatura</h1><p className="mt-1 text-sm text-muted-foreground">Plano, vencimentos e histórico em um só lugar.</p></div></div><div className="grid grid-cols-2 rounded-xl border bg-muted/35 p-1"><button className={cn("min-h-9 rounded-lg px-4 text-xs font-semibold", cycle === "monthly" && "bg-background shadow-sm")} onClick={() => setCycle("monthly")}>Mensal</button><button className={cn("min-h-9 rounded-lg px-4 text-xs font-semibold", cycle === "annual" && "bg-background shadow-sm")} onClick={() => setCycle("annual")}>Anual</button></div></header>
    {!billing.data.providerReady && <div className="flex gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="text-sm font-semibold">Cobrança preparada para conexão</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Planos e solicitações já ficam registrados com segurança. Nenhum pagamento é confirmado até a integração com o provedor de cobrança.</p></div></div>}
    <section className="grid gap-3 md:grid-cols-3"><Summary icon={CreditCard} label="Plano atual" value={billing.data.plans.find((plan) => plan.id === currentPlanId)?.name ?? "Sem plano"} detail={statusLabel(billing.data.subscription?.status)} /><Summary icon={Clock3} label="Próxima renovação" value={formatDate(billing.data.subscription?.current_period_end)} detail={cycle === "annual" ? "ciclo anual" : "ciclo mensal"} /><Summary icon={ReceiptText} label="Última cobrança" value={billing.data.payments[0] ? brl.format(billing.data.payments[0].amount) : "Sem cobrança"} detail={billing.data.payments[0] ? statusLabel(billing.data.payments[0].status) : "histórico vazio"} /></section>
    <section><div className="mb-3"><h2 className="text-lg font-semibold">Planos para corretor individual</h2><p className="text-xs text-muted-foreground">Sem gestão de equipe e sem cobrança fictícia.</p></div><div className="grid gap-4 lg:grid-cols-2">{billing.data.plans.map((plan) => { const active = plan.id === currentPlanId; const value = cycle === "annual" ? plan.annual_price : plan.monthly_price; return <Card key={plan.id} className={cn("overflow-hidden", active && "border-primary ring-2 ring-primary/10")}><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{plan.name}</CardTitle><CardDescription className="mt-1">{plan.description}</CardDescription></div>{active && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">ATUAL</span>}</div><p className="mt-4 text-3xl font-semibold">{brl.format(value)} <span className="text-xs font-normal text-muted-foreground">/{cycle === "annual" ? "ano" : "mês"}</span></p></CardHeader><CardContent><div className="grid gap-2">{plan.features.slice(0, 8).map((feature) => <p key={feature} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-emerald-600" />{feature}</p>)}</div><Button className="mt-5 w-full" variant={active ? "outline" : "default"} disabled={active || Boolean(pending) || billing.createRequest.isPending} onClick={() => void requestPlan(plan.id)}>{active ? "Plano atual" : pending ? "Solicitação em análise" : "Solicitar este plano"}</Button></CardContent></Card>; })}</div></section>
    <Card><CardHeader><CardTitle>Histórico de cobrança</CardTitle><CardDescription>Valores do SaaS separados do financeiro profissional.</CardDescription></CardHeader><CardContent>{billing.data.payments.length ? <div className="divide-y rounded-xl border">{billing.data.payments.map((payment) => <div key={payment.id} className="flex items-center justify-between gap-3 p-3"><div><p className="text-sm font-semibold">{brl.format(payment.amount)}</p><p className="text-xs text-muted-foreground">Vencimento {formatDate(payment.due_date)}</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold">{statusLabel(payment.status)}</span></div>)}</div> : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma cobrança registrada.</p>}</CardContent></Card>
  </div>;
}

function Summary({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string; detail: string }) { return <Card><CardContent className="flex items-center gap-3 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p><p className="mt-1 truncate font-semibold">{value}</p><p className="text-xs text-muted-foreground">{detail}</p></div></CardContent></Card>; }
function statusLabel(value?: string | null) { return ({ active: "Ativo", trialing: "Período de teste", past_due: "Pagamento pendente", suspended: "Suspenso", canceled: "Cancelado", pending: "Pendente", paid: "Pago", overdue: "Atrasado", refunded: "Estornado" } as Record<string, string>)[value ?? ""] ?? "Não informado"; }
function formatDate(value?: string | null) { return value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "Não definida"; }
