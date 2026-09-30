import { useEffect, useMemo, useState } from "react";
import { addDays, format, isSameMonth, parseISO, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Car,
  Crown,
  Download,
  Home,
  LineChart,
  MapPin,
  Plane,
  Plus,
  Receipt,
  Search,
  Sparkles,
  TrendingUp,
  WalletCards
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { clampPercent, cn, formatCurrency } from "@/lib/utils";
import { useProfile } from "@/features/profile/use-profile";
import { useClients } from "@/features/clients/use-clients";
import { expenseCategories, incomeCategories, installmentBalance, paymentMethods, sum } from "@/features/finance/finance-utils";
import { useFinance } from "@/features/finance/use-finance";
import type { Client, Commission, CommissionInstallment, FinancialTransaction } from "@/types/database";

type FinanceTab = "dashboard" | "commissions" | "receivable" | "payable" | "cashflow" | "result" | "calendar";
type FinanceForm = "income" | "expense" | "payable" | "commission" | null;

const tabs: Array<{ id: FinanceTab; label: string }> = [
  { id: "dashboard", label: "Visão geral" },
  { id: "commissions", label: "Comissões" },
  { id: "receivable", label: "Receber" },
  { id: "payable", label: "Pagar" },
  { id: "cashflow", label: "Fluxo" },
  { id: "result", label: "Resultado" },
  { id: "calendar", label: "Calendário" }
];

export function FinancePage() {
  const finance = useFinance();
  const { clients } = useClients();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [tab, setTab] = useState<FinanceTab>("dashboard");
  const [form, setForm] = useState<FinanceForm>(null);
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");

  const monthReceivedSales = finance.commissions.filter((item) => item.status === "recebida" && item.sale_date && isSameMonth(parseISO(item.sale_date), new Date()));
  const avgGross = monthReceivedSales.length ? sum(monthReceivedSales.map((item) => item.gross_commission)) / monthReceivedSales.length : null;
  const avgNet = monthReceivedSales.length ? sum(monthReceivedSales.map((item) => item.net_commission)) / monthReceivedSales.length : null;
  const ticketMonth = monthReceivedSales.length ? sum(monthReceivedSales.map((item) => item.vgv)) / monthReceivedSales.length : null;

  const filteredTransactions = finance.transactions.filter((item) => {
    const haystack = `${item.description} ${item.category} ${item.payment_method ?? ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  function exportCsv(kind: "transactions" | "commissions" | "installments") {
    const rows =
      kind === "transactions"
        ? finance.transactions
        : kind === "commissions"
          ? finance.commissions
          : finance.installments;
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${kind}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function markInstallmentReceived(installment: CommissionInstallment, amount?: number) {
    const receivedAmount = amount ?? installment.expected_amount;
    const status = receivedAmount >= installment.expected_amount ? "recebida" : "parcialmente recebida";
    await finance.updateInstallment.mutateAsync({
      id: installment.id,
      input: {
        received_amount: receivedAmount,
        received_date: format(new Date(), "yyyy-MM-dd"),
        status
      }
    });
    toast({ title: status === "recebida" ? "Parcela quitada." : "Recebimento parcial registrado." });
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="motion-rise overflow-hidden rounded-[1.75rem] border bg-card text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[linear-gradient(135deg,#05070b,#11151d)] dark:text-white dark:shadow-soft md:rounded-[2rem]">
        <div className="relative p-4 md:p-8">
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase text-primary md:mb-4">
                <WalletCards className="h-3.5 w-3.5" />
                Financeiro MV Broker
              </div>
              <h1 className="max-w-3xl text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">Controle financeiro</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground dark:text-white/62 md:mt-3">
                Separação clara entre realizado, confirmado, previsto, potencial e atrasado. Sem misturar promessa com caixa.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:min-w-[420px] sm:gap-3">
              <HeroMetric label="Resultado mês" value={formatCurrency(finance.metrics.netResultMonth)} />
              <HeroMetric label="Receber hoje" value={formatCurrency(finance.metrics.receiveToday)} />
            </div>
          </div>
        </div>
      </section>

      <div className="scrollbar-none flex w-full gap-2 overflow-x-auto pb-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "min-h-10 shrink-0 rounded-2xl border px-4 py-2 text-sm font-semibold transition",
              tab === item.id ? "border-primary bg-primary text-primary-foreground shadow-soft" : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="grid grid-cols-2 gap-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1 xl:grid-cols-5">
        <FinanceCard featured label="Resultado líquido" value={formatCurrency(finance.metrics.netResultMonth)} icon={LineChart} onClick={() => setTab("result")} />
        <FinanceCard label="Comissão recebida" value={formatCurrency(finance.metrics.commissionReceivedMonth)} icon={Banknote} onClick={() => setTab("commissions")} />
        <FinanceCard label="A receber" value={formatCurrency(finance.metrics.commissionReceivable)} icon={ArrowDownCircle} onClick={() => setTab("receivable")} />
        <FinanceCard label="Despesas" value={formatCurrency(finance.metrics.expensesMonth)} icon={ArrowUpCircle} onClick={() => setTab("payable")} />
        <FinanceCard label="Potencial" value={formatCurrency(finance.metrics.commissionPotential)} icon={TrendingUp} />
      </section>

      <div className="rounded-3xl border bg-card p-3 shadow-sm md:flex md:items-center md:justify-between md:gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-11" placeholder="Pesquisar cliente, imóvel, categoria..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:mt-0 md:flex">
          <Button className="min-h-11 px-2 text-xs sm:text-sm" onClick={() => setForm("income")}>
            <Plus className="h-4 w-4" />
            Receita
          </Button>
          <Button className="min-h-11 px-2 text-xs sm:text-sm" variant="outline" onClick={() => setForm("expense")}>
            <Plus className="h-4 w-4" />
            Despesa
          </Button>
          <Button className="min-h-11 px-2 text-xs sm:text-sm" variant="outline" onClick={() => setForm("payable")}>
            <Plus className="h-4 w-4" />
            Conta a pagar
          </Button>
          <Button className="min-h-11 px-2 text-xs sm:text-sm" variant="outline" onClick={() => setForm("commission")}>
            <Plus className="h-4 w-4" />
            Comissão
          </Button>
        </div>
      </div>

      {tab === "dashboard" && (
        <DashboardFinance
          finance={finance}
          profile={profile}
          avgGross={avgGross}
          avgNet={avgNet}
          ticketMonth={ticketMonth}
          clients={clients}
          onOpen={(next) => setTab(next)}
        />
      )}
      {tab === "commissions" && <CommissionList commissions={finance.commissions} installments={finance.installments} onReceive={markInstallmentReceived} onExport={() => exportCsv("commissions")} />}
      {tab === "receivable" && <ReceivableList installments={finance.installments} commissions={finance.commissions} filter={filter} onFilter={setFilter} onReceive={markInstallmentReceived} onExport={() => exportCsv("installments")} />}
      {tab === "payable" && <TransactionList title="Contas a pagar e despesas" type="expense" transactions={filteredTransactions} onExport={() => exportCsv("transactions")} onPay={(transaction) => finance.updateTransaction.mutate({ id: transaction.id, input: { status: "pago", paid_date: format(new Date(), "yyyy-MM-dd") } })} />}
      {tab === "cashflow" && <CashFlow transactions={finance.transactions} installments={finance.installments} />}
      {tab === "result" && <FinancialResult finance={finance} profile={profile} avgGross={avgGross} avgNet={avgNet} ticketMonth={ticketMonth} />}
      {tab === "calendar" && <FinancialCalendar transactions={finance.transactions} installments={finance.installments} />}

      <Dialog open={Boolean(form)} onOpenChange={() => setForm(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form === "commission" ? "Nova comissão" : form === "expense" ? "Nova despesa paga" : form === "payable" ? "Nova conta a pagar" : "Nova receita"}</DialogTitle>
            <DialogDescription>
              {form === "commission" ? "Cadastre venda, comissão e parcelamento automático." : form === "payable" ? "A conta ficará pendente até você registrar o pagamento." : form === "expense" ? "A despesa será registrada como paga e entrará no resultado do mês." : "Cadastro rápido para poucos toques no celular."}
            </DialogDescription>
          </DialogHeader>
          {form === "commission" ? (
            <CommissionForm onSaved={() => setForm(null)} />
          ) : form ? (
            <TransactionForm type={form === "income" ? "income" : "expense"} settlement={form === "payable" ? "pending" : "paid"} onSaved={() => setForm(null)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DashboardFinance({
  finance,
  profile,
  avgGross,
  avgNet,
  ticketMonth,
  clients,
  onOpen
}: {
  finance: ReturnType<typeof useFinance>;
  profile: any;
  avgGross: number | null;
  avgNet: number | null;
  ticketMonth: number | null;
  clients: Client[];
  onOpen: (tab: FinanceTab) => void;
}) {
  const commissionGoal = profile?.meta_comissao_mensal ?? 0;
  const vgvGoal = profile?.meta_vgv_mensal ?? 0;
  const commissionProgress = commissionGoal ? clampPercent((finance.metrics.commissionReceivedMonth / commissionGoal) * 100) : 0;
  const vgvProgress = vgvGoal ? clampPercent((finance.metrics.vgvMonth / vgvGoal) * 100) : 0;

  return (
    <div className="space-y-5">
      <SalesPortfolio commissions={finance.commissions} installments={finance.installments} onOpen={() => onOpen("commissions")} />
      <FinancialPerformance transactions={finance.transactions} installments={finance.installments} />
      <CommissionRankings commissions={finance.commissions} clients={clients} />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Próximos recebimentos</CardTitle>
            <CardDescription>Previsão separada por período. Valores potenciais não entram aqui.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <ForecastItem label="Hoje" value={finance.metrics.forecast.today} />
            <ForecastItem label="7 dias" value={finance.metrics.forecast.next7} />
            <ForecastItem label="30 dias" value={finance.metrics.forecast.next30} />
            <ForecastItem label="60 dias" value={finance.metrics.forecast.next60} />
            <ForecastItem label="90 dias" value={finance.metrics.forecast.next90} />
            <ForecastItem label="Após 90 dias" value={finance.metrics.forecast.after90} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projeção financeira</CardTitle>
            <CardDescription>Recebido, confirmado e potencial ficam sempre separados.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <ProjectionCard label="Recebido" value={finance.metrics.commissionReceivedMonth} />
            <ProjectionCard label="Confirmado" value={finance.metrics.commissionReceivable} />
            <ProjectionCard label="Potencial" value={finance.metrics.commissionPotential} muted />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receitas x despesas</CardTitle>
            <CardDescription>Leitura simples do mês atual.</CardDescription>
          </CardHeader>
          <CardContent>
            <MiniBarChart income={finance.metrics.incomeMonth} expenses={finance.metrics.expensesMonth} />
          </CardContent>
        </Card>

        <ExpenseAIReport transactions={finance.transactions} />
      </div>

      <div className="space-y-5">
        <Card className="border-border bg-card text-foreground dark:border-primary/25 dark:bg-[#070A0F] dark:text-white">
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
            <CardDescription>Pontos que pedem ação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <AlertLine text={`Você possui ${formatCurrency(finance.metrics.receiveToday)} para receber hoje.`} />
            <AlertLine text={`Há ${finance.metrics.overdueAccounts} contas ou comissões vencidas.`} />
            <AlertLine text={`Você tem ${formatCurrency(finance.metrics.payToday)} para pagar hoje.`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metas financeiras</CardTitle>
            <CardDescription>Integrado ao perfil.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoalProgress label="Meta comissão" value={finance.metrics.commissionReceivedMonth} target={commissionGoal} progress={commissionProgress} />
            <GoalProgress label="Meta VGV" value={finance.metrics.vgvMonth} target={vgvGoal} progress={vgvProgress} />
            <GoalProgress label="Meta resultado líquido" value={finance.metrics.netResultMonth} target={profile?.meta_comissao_mensal ?? 0} progress={commissionProgress} />
          </CardContent>
        </Card>

        <DreamGoalsCard />

        <Card>
          <CardHeader>
            <CardTitle>Indicadores</CardTitle>
            <CardDescription>Calculados apenas quando há dados suficientes.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <DataLine label="Comissão média bruta" value={avgGross === null ? "Dados insuficientes para calcular." : formatCurrency(avgGross)} />
            <DataLine label="Comissão média líquida" value={avgNet === null ? "Dados insuficientes para calcular." : formatCurrency(avgNet)} />
            <DataLine label="Ticket médio mensal" value={ticketMonth === null ? "Dados insuficientes para calcular." : formatCurrency(ticketMonth)} />
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full" onClick={() => onOpen("result")}>
          Ver resultado financeiro
        </Button>
      </div>
      </div>
    </div>
  );
}

function SalesPortfolio({ commissions, installments, onOpen }: { commissions: Commission[]; installments: CommissionInstallment[]; onOpen: () => void }) {
  const [query, setQuery] = useState("");
  const now = new Date();
  const monthKey = format(now, "yyyy-MM");
  const yearKey = format(now, "yyyy");
  const sales = commissions.filter((item) => item.status !== "cancelada").sort((a, b) => (b.sale_date ?? b.created_at).localeCompare(a.sale_date ?? a.created_at));
  const monthSales = sales.filter((item) => item.sale_date?.startsWith(monthKey));
  const yearSales = sales.filter((item) => item.sale_date?.startsWith(yearKey));
  const totalCommission = sum(sales.map((item) => item.net_commission));
  const receivedCommission = sum(installments.map((item) => item.received_amount));
  const yearVgv = sum(yearSales.map((item) => item.vgv));
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = subMonths(now, 5 - index);
    const key = format(date, "yyyy-MM");
    const rows = sales.filter((item) => item.sale_date?.startsWith(key));
    return { key, label: format(date, "MMM", { locale: ptBR }).replace(".", ""), count: rows.length, vgv: sum(rows.map((item) => item.vgv)), commission: sum(rows.map((item) => item.net_commission)) };
  });
  const maxCommission = Math.max(...months.map((item) => item.commission), 1);
  const statusGroups = ["recebida", "parcialmente recebida", "confirmada", "atrasada", "em negociação", "estimada"].map((status) => ({ status, count: sales.filter((item) => item.status === status).length, value: sum(sales.filter((item) => item.status === status).map((item) => item.net_commission)) })).filter((item) => item.count);
  const maxStatus = Math.max(...statusGroups.map((item) => item.value), 1);
  const visibleSales = sales.filter((item) => `${item.client ?? ""} ${item.property ?? ""} ${item.development ?? ""} ${item.builder ?? ""}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));

  return <section className="motion-rise space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase text-primary"><BriefcaseBusiness className="h-4 w-4" />Carteira de vendas</div><h2 className="mt-1 text-xl font-semibold">Vendas e comissões</h2><p className="mt-1 text-sm text-muted-foreground">Visão consolidada das vendas cadastradas, sem contar cancelamentos.</p></div><Button variant="outline" onClick={onOpen}>Abrir comissões</Button></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <SalesMetric label="Vendas no mês" value={String(monthSales.length)} helper={format(now, "MMMM", { locale: ptBR })} />
      <SalesMetric label="Vendas no ano" value={String(yearSales.length)} helper={yearKey} />
      <SalesMetric label="Comissão gerada" value={formatCurrency(totalCommission)} helper="total não cancelado" wide />
      <SalesMetric label="Comissão recebida" value={formatCurrency(receivedCommission)} helper="parcelas recebidas" />
      <SalesMetric label="VGV no ano" value={formatCurrency(yearVgv)} helper={`${yearSales.length} venda(s)`} />
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="overflow-hidden"><CardHeader><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><CardTitle>Evolução das vendas</CardTitle></div><CardDescription>Comissão líquida gerada e quantidade de vendas nos últimos seis meses.</CardDescription></CardHeader><CardContent><div className="grid h-56 grid-cols-6 items-end gap-2 border-b border-border/70 pt-4 sm:gap-5">{months.map((item, index) => <div key={item.key} className="flex h-full min-w-0 flex-col justify-end gap-2" style={{ animationDelay: `${index * 45}ms` }}><div className="flex h-40 items-end justify-center"><div title={`${formatCurrency(item.commission)} · ${item.count} venda(s)`} className="w-full max-w-10 rounded-t-lg border border-primary/25 bg-primary/15 transition-all duration-700 dark:bg-primary/35" style={{ height: `${item.commission ? Math.max((item.commission / maxCommission) * 100, 8) : 3}%` }} /></div><div className="text-center"><p className="text-xs font-semibold tabular-nums">{item.count}</p><p className="truncate text-[0.65rem] font-medium uppercase text-muted-foreground">{item.label}</p></div></div>)}</div><div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>Altura: comissão gerada</span><span>Número: vendas</span></div></CardContent></Card>
      <Card><CardHeader><CardTitle>Status das comissões</CardTitle><CardDescription>Valores mantidos separados por estágio financeiro.</CardDescription></CardHeader><CardContent className="space-y-4">{statusGroups.length ? statusGroups.map((item) => <div key={item.status}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="capitalize text-muted-foreground">{item.status} · {item.count}</span><strong>{formatCurrency(item.value)}</strong></div><div className="h-2 overflow-hidden rounded-full border bg-background"><div className="h-full rounded-full bg-foreground/75 transition-all duration-700 dark:bg-primary" style={{ width: `${Math.max((item.value / maxStatus) * 100, 3)}%` }} /></div></div>) : <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">Cadastre vendas para visualizar a distribuição.</p>}</CardContent></Card>
    </div>
    <Card><CardHeader className="gap-3 sm:flex-row sm:items-end sm:justify-between"><div><CardTitle>Todas as vendas</CardTitle><CardDescription>Cliente, imóvel, data, VGV, comissão e situação.</CardDescription></div><div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Buscar venda" /></div></CardHeader><CardContent>{visibleSales.length ? <div className="max-h-[520px] overflow-auto rounded-2xl border"><div className="hidden min-w-[760px] grid-cols-[1.2fr_1.3fr_110px_130px_140px_120px] gap-3 border-b bg-muted/45 px-4 py-3 text-[0.68rem] font-semibold uppercase text-muted-foreground md:grid"><span>Cliente</span><span>Imóvel</span><span>Data</span><span>VGV</span><span>Comissão</span><span>Status</span></div>{visibleSales.map((sale) => <article key={sale.id} className="grid gap-2 border-b p-4 last:border-b-0 md:min-w-[760px] md:grid-cols-[1.2fr_1.3fr_110px_130px_140px_120px] md:items-center md:gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{sale.client || "Cliente não informado"}</p><p className="truncate text-xs text-muted-foreground md:hidden">{sale.property ?? sale.development ?? "Imóvel não informado"}</p></div><p className="hidden truncate text-sm text-muted-foreground md:block">{sale.property ?? sale.development ?? "Imóvel não informado"}</p><p className="text-xs text-muted-foreground">{sale.sale_date ? format(parseISO(sale.sale_date), "dd/MM/yyyy") : "Sem data"}</p><p className="text-sm font-medium">{formatCurrency(sale.vgv)}</p><p className="text-sm font-semibold">{formatCurrency(sale.net_commission)}</p><StatusBadge status={sale.status} /></article>)}</div> : <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma venda encontrada.</div>}</CardContent></Card>
  </section>;
}

function SalesMetric({ label, value, helper, wide }: { label: string; value: string; helper: string; wide?: boolean }) {
  return <article className={cn("rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.035)]", wide && "col-span-2 lg:col-span-1")}><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 truncate text-xl font-semibold sm:text-2xl">{value}</p><p className="mt-1 truncate text-[0.68rem] text-muted-foreground">{helper}</p></article>;
}

function FinancialPerformance({ transactions, installments }: { transactions: FinancialTransaction[]; installments: CommissionInstallment[] }) {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const selectedDate = parseISO(`${month}-01`);
  const current = financialMonthSnapshot(month, transactions, installments);
  const previous = financialMonthSnapshot(format(subMonths(selectedDate, 1), "yyyy-MM"), transactions, installments);
  const chart = Array.from({ length: 6 }, (_, index) => {
    const date = subMonths(selectedDate, 5 - index);
    return {
      key: format(date, "yyyy-MM"),
      label: format(date, "MMM", { locale: ptBR }).replace(".", ""),
      ...financialMonthSnapshot(format(date, "yyyy-MM"), transactions, installments)
    };
  });
  const allMonths = new Set<string>();
  transactions.forEach((item) => {
    const date = item.paid_date ?? item.due_date;
    if (date) allMonths.add(date.slice(0, 7));
  });
  installments.forEach((item) => item.received_date && allMonths.add(item.received_date.slice(0, 7)));
  const ranked = [...allMonths].map((key) => ({ key, ...financialMonthSnapshot(key, transactions, installments) })).filter((item) => item.income || item.expenses).sort((a, b) => b.result - a.result);
  const best = ranked[0];
  const comparison = previous.result ? Math.round(((current.result - previous.result) / Math.abs(previous.result)) * 100) : null;
  const maxChart = Math.max(...chart.flatMap((item) => [item.income, item.expenses]), 1);

  return (
    <Card className="motion-rise overflow-hidden border-border bg-card text-foreground dark:border-white/10 dark:bg-[#070A0F] dark:text-white dark:shadow-[0_28px_80px_rgba(0,0,0,0.24)]">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-primary"><LineChart className="h-4 w-4" /> Desempenho financeiro</div>
            <CardTitle>Resultado por mês</CardTitle>
            <CardDescription>Somente receitas recebidas e despesas efetivamente pagas.</CardDescription>
          </div>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Período
            <input type="month" value={month} max={format(new Date(), "yyyy-MM")} onChange={(event) => setMonth(event.target.value)} className="h-11 rounded-2xl border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/35 dark:border-white/10 dark:bg-white/[0.06] dark:text-white" />
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-3 sm:p-5">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <DarkMetric label="Resultado filtrado" value={formatCurrency(current.result)} helper={`${formatCurrency(current.income)} recebidos`} featured />
          <DarkMetric label="Melhor mês" value={best ? formatCurrency(best.result) : "Sem dados"} helper={best ? format(parseISO(`${best.key}-01`), "MMMM 'de' yyyy", { locale: ptBR }) : "Registre movimentos"} />
          <DarkMetric label="Comparativo anterior" value={comparison === null ? "Sem base" : `${comparison >= 0 ? "+" : ""}${comparison}%`} helper={`Anterior: ${formatCurrency(previous.result)}`} positive={comparison !== null && comparison >= 0} />
          <DarkMetric label="Despesas do período" value={formatCurrency(current.expenses)} helper={`${current.movements} movimento(s)`} />
        </div>
        <div className="rounded-[1.4rem] border bg-background/45 p-4 dark:border-white/10 dark:bg-white/[0.035]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-semibold">Receitas x despesas</p><p className="text-xs text-muted-foreground">Últimos seis meses até o período selecionado.</p></div>
            <div className="flex gap-3 text-[0.68rem] text-muted-foreground"><ChartKey tone="bg-emerald-500" label="Receitas" /><ChartKey tone="bg-foreground/65 dark:bg-primary" label="Despesas" /></div>
          </div>
          <div className="grid h-48 grid-cols-6 items-end gap-2 sm:gap-5">
            {chart.map((item) => (
              <div key={item.key} className="flex h-full min-w-0 flex-col justify-end gap-2">
                <div className="flex h-36 items-end justify-center gap-1.5">
                  <FinanceChartColumn value={item.income} max={maxChart} tone="bg-emerald-500" />
                  <FinanceChartColumn value={item.expenses} max={maxChart} tone="bg-foreground/65 dark:bg-primary" />
                </div>
                <span className="truncate text-center text-[0.65rem] font-semibold uppercase text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DarkMetric({ label, value, helper, featured, positive }: { label: string; value: string; helper: string; featured?: boolean; positive?: boolean }) {
  return (
    <div className={cn("min-w-0 rounded-[1.35rem] border bg-card p-4 dark:border-white/10 dark:bg-white/[0.045]", featured && "border-primary/35 bg-primary/5 dark:bg-primary/10")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-2 truncate text-xl font-semibold sm:text-2xl", positive && "text-emerald-600 dark:text-emerald-400")}>{value}</p>
      <p className="mt-2 truncate text-[0.68rem] text-muted-foreground">{helper}</p>
    </div>
  );
}

function ChartKey({ tone, label }: { tone: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full", tone)} />{label}</span>;
}

function FinanceChartColumn({ value, max, tone }: { value: number; max: number; tone: string }) {
  const height = value ? Math.max((value / max) * 100, 6) : 2;
  return <div title={formatCurrency(value)} className={cn("w-3 rounded-t-sm sm:w-5", tone)} style={{ height: `${height}%` }} />;
}

function financialMonthSnapshot(month: string, transactions: FinancialTransaction[], installments: CommissionInstallment[]) {
  const paidTransactions = transactions.filter((item) => {
    const settled = item.type === "income" ? item.status === "recebido" : item.status === "pago";
    return settled && (item.paid_date ?? item.due_date)?.startsWith(month);
  });
  const receivedInstallments = installments.filter((item) => item.received_amount > 0 && item.received_date?.startsWith(month));
  const income = sum(paidTransactions.filter((item) => item.type === "income").map((item) => item.amount)) + sum(receivedInstallments.map((item) => item.received_amount));
  const expenses = sum(paidTransactions.filter((item) => item.type === "expense").map((item) => item.amount));
  return { income, expenses, result: income - expenses, movements: paidTransactions.length + receivedInstallments.length };
}

type RankedItem = {
  label: string;
  detail: string;
  value: number;
};

function CommissionRankings({ commissions, clients }: { commissions: Commission[]; clients: Client[] }) {
  const rankings = useMemo(() => {
    const generated = commissions.filter((commission) =>
      ["confirmada", "parcialmente recebida", "recebida", "atrasada"].includes(commission.status)
    );
    const cityByClient = new Map(
      clients
        .filter((client) => client.city)
        .map((client) => [normalizeName(client.name), client.city!] as const)
    );

    const sales = generated
      .map((commission) => ({
        label: commission.property ?? commission.development ?? "Venda sem imóvel informado",
        detail: commission.client ?? "Cliente não informado",
        value: commission.net_commission
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    return {
      sales,
      customers: groupRanking(generated, (commission) => commission.client, "venda", "vendas"),
      cities: groupRanking(generated, (commission) => {
        if (!commission.client) return null;
        return cityByClient.get(normalizeName(commission.client)) ?? null;
      }, "comissão", "comissões")
    };
  }, [clients, commissions]);

  return (
    <Card className="motion-rise overflow-hidden border-border bg-card text-foreground dark:border-primary/25 dark:bg-[linear-gradient(145deg,#05070b,#11151d)] dark:text-white dark:shadow-[0_26px_80px_rgba(0,0,0,0.24)]">
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_32px_hsl(var(--primary)/0.24)]">
            <Crown className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Ranking de comissões</CardTitle>
            <CardDescription className="mt-1">
              Somente vendas confirmadas, recebidas, parciais ou atrasadas entram no ranking.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-0 p-0 lg:grid-cols-3">
        <RankingColumn title="Melhores vendas" icon={TrendingUp} items={rankings.sales} empty="Nenhuma comissão gerada ainda." />
        <RankingColumn title="Melhores clientes" icon={Crown} items={rankings.customers} empty="Nenhum cliente com comissão gerada." />
        <RankingColumn title="Melhores cidades" icon={MapPin} items={rankings.cities} empty="Cadastre a cidade do cliente para formar este ranking." />
      </CardContent>
    </Card>
  );
}

function RankingColumn({ title, icon: Icon, items, empty }: { title: string; icon: React.ElementType; items: RankedItem[]; empty: string }) {
  return (
    <section className="border-b p-4 last:border-b-0 sm:p-5 lg:border-b-0 lg:border-r lg:last:border-r-0">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      {items.length ? (
        <ol className="space-y-3">
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5">
              <span className={cn(
                "grid h-8 w-8 place-items-center rounded-full border text-xs font-bold",
                index === 0 ? "border-primary/50 bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground dark:border-white/15 dark:bg-white/5 dark:text-white/65"
              )}>
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.label}</p>
                <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <p className="whitespace-nowrap text-xs font-semibold text-primary sm:text-sm">{formatCurrency(item.value)}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-2xl border border-dashed bg-background/50 p-4 text-sm leading-5 text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function groupRanking(
  commissions: Commission[],
  keyFor: (commission: Commission) => string | null,
  singular: string,
  plural: string
): RankedItem[] {
  const grouped = new Map<string, { label: string; value: number; count: number }>();
  commissions.forEach((commission) => {
    const label = keyFor(commission)?.trim();
    if (!label) return;
    const key = normalizeName(label);
    const current = grouped.get(key) ?? { label, value: 0, count: 0 };
    current.value += commission.net_commission;
    current.count += 1;
    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((item) => ({
      label: item.label,
      detail: `${item.count} ${item.count === 1 ? singular : plural}`,
      value: item.value
    }));
}

function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function CommissionList({
  commissions,
  installments,
  onReceive,
  onExport
}: {
  commissions: Commission[];
  installments: CommissionInstallment[];
  onReceive: (installment: CommissionInstallment) => void;
  onExport: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Comissões</CardTitle>
          <CardDescription>Histórico, status e parcelas vinculadas.</CardDescription>
        </div>
        <Button className="w-full sm:w-auto" variant="outline" onClick={onExport}>
          <Download className="h-4 w-4" />
          CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {commissions.map((commission) => {
          const linked = installments.filter((item) => item.commission_id === commission.id);
          return (
            <article key={commission.id} className="rounded-3xl border bg-card p-3 shadow-sm sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <StatusBadge status={commission.status} />
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{commission.builder ?? "sem construtora"}</span>
                  </div>
                  <h3 className="truncate text-base font-semibold sm:text-lg">{commission.client ?? "Cliente não informado"}</h3>
                  <p className="truncate text-sm text-muted-foreground">{commission.property ?? commission.development ?? "Imóvel não informado"}</p>
                </div>
                <div className="rounded-2xl bg-muted p-3 text-left lg:bg-transparent lg:p-0 lg:text-right">
                  <p className="text-xs text-muted-foreground">Comissão líquida</p>
                  <p className="text-xl font-semibold sm:text-2xl">{formatCurrency(commission.net_commission)}</p>
                  <p className="text-xs text-muted-foreground">VGV {formatCurrency(commission.vgv)}</p>
                </div>
              </div>
              <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 md:grid md:grid-cols-3 md:overflow-visible">
                {linked.map((installment) => (
                  <InstallmentCard key={installment.id} installment={installment} onReceive={() => onReceive(installment)} />
                ))}
              </div>
              <div className="mt-4 border-l-2 border-primary/40 pl-3 text-xs text-muted-foreground">
                <p>Venda cadastrada {commission.sale_date ?? "sem data"}</p>
                <p>Comissão {commission.status}</p>
                {linked.map((item) => (
                  <p key={item.id}>
                    {item.installment_number}ª parcela {item.status} - {item.due_date}
                  </p>
                ))}
              </div>
            </article>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ReceivableList({
  installments,
  commissions,
  filter,
  onFilter,
  onReceive,
  onExport
}: {
  installments: CommissionInstallment[];
  commissions: Commission[];
  filter: string;
  onFilter: (filter: string) => void;
  onReceive: (installment: CommissionInstallment, amount?: number) => void;
  onExport: () => void;
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const rows = installments.filter((item) => {
    const days = Math.ceil((parseISO(item.due_date).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
    if (filter === "hoje") return item.due_date === today;
    if (filter === "atrasadas") return days < 0 && item.status !== "recebida";
    if (filter === "7") return days >= 0 && days <= 7;
    if (filter === "30") return days >= 0 && days <= 30;
    if (filter === "recebidas") return item.status === "recebida";
    if (filter === "pendentes") return item.status !== "recebida" && item.status !== "cancelada";
    return true;
  });

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Contas a receber</CardTitle>
            <CardDescription>Parcelas de comissão e recebimentos previstos.</CardDescription>
          </div>
          <Button className="w-full sm:w-auto" variant="outline" onClick={onExport}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {["todos", "hoje", "atrasadas", "7", "30", "recebidas", "pendentes"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onFilter(item)}
              className={cn("min-h-9 shrink-0 rounded-full border px-3 py-1 text-xs font-semibold", filter === item ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}
            >
              {item === "7" ? "7 dias" : item === "30" ? "30 dias" : item}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((installment) => {
          const commission = commissions.find((item) => item.id === installment.commission_id);
          return (
            <article key={installment.id} className="grid gap-3 rounded-3xl border bg-card p-3 shadow-sm sm:p-4 lg:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={installment.status} />
                  <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{installment.due_date}</span>
                </div>
                <h3 className="mt-2 truncate font-semibold">{commission?.client ?? "Comissão"}</h3>
                <p className="truncate text-sm text-muted-foreground">{commission?.property ?? "Origem: comissão"} • parcela {installment.installment_number}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 lg:min-w-[420px]">
                <MiniAmount label="Previsto" value={installment.expected_amount} />
                <MiniAmount label="Recebido" value={installment.received_amount} />
                <MiniAmount label="Saldo" value={installmentBalance(installment)} />
              </div>
              {installment.status !== "recebida" && (
                <div className="grid grid-cols-2 gap-2 lg:col-span-2 sm:flex sm:flex-wrap">
                  <Button className="min-h-10" size="sm" onClick={() => onReceive(installment)}>
                    Receber integral
                  </Button>
                  <Button className="min-h-10" size="sm" variant="outline" onClick={() => onReceive(installment, Math.round(installment.expected_amount * 0.6))}>
                    Receber parcial 60%
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </CardContent>
    </Card>
  );
}

function TransactionList({
  title,
  type,
  transactions,
  onPay,
  onExport
}: {
  title: string;
  type: "income" | "expense";
  transactions: FinancialTransaction[];
  onPay: (transaction: FinancialTransaction) => void;
  onExport: () => void;
}) {
  const rows = transactions.filter((item) => item.type === type);
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Descrição, categoria, vencimento, status e forma de pagamento.</CardDescription>
        </div>
        <Button className="w-full sm:w-auto" variant="outline" onClick={onExport}>
          <Download className="h-4 w-4" />
          CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((transaction) => (
          <article key={transaction.id} className="grid gap-3 rounded-3xl border bg-card p-3 shadow-sm sm:p-4 md:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={transaction.status} />
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{transaction.category}</span>
              </div>
              <h3 className="mt-2 truncate font-semibold">{transaction.description}</h3>
              <p className="truncate text-sm text-muted-foreground">Vence {transaction.due_date ?? "sem data"} • {transaction.payment_method ?? "sem forma"}</p>
            </div>
            <div className="rounded-2xl bg-muted p-3 text-left md:bg-transparent md:p-0 md:text-right">
              <p className="text-xl font-semibold sm:text-2xl">{formatCurrency(transaction.amount)}</p>
              {transaction.status !== "pago" && transaction.type === "expense" && (
                <Button size="sm" className="mt-2 min-h-10 w-full md:w-auto" onClick={() => onPay(transaction)}>
                  Marcar pago
                </Button>
              )}
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}

function CashFlow({ transactions, installments }: { transactions: FinancialTransaction[]; installments: CommissionInstallment[] }) {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const rows = useMemo(() => {
    const entries = [
      ...transactions.filter((item) => item.type === "income" ? item.status === "recebido" : item.status === "pago").map((item) => ({
        date: item.paid_date ?? item.due_date ?? format(new Date(), "yyyy-MM-dd"),
        description: item.description,
        category: item.category,
        type: item.type,
        amount: item.type === "income" ? item.amount : -item.amount
      })),
      ...installments.filter((item) => item.received_amount > 0 && item.received_date).map((item) => ({
        date: item.received_date ?? item.due_date,
        description: `Comissão parcela ${item.installment_number}`,
        category: "comissão",
        type: "income" as const,
        amount: item.received_amount
      }))
    ].filter((item) => item.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date));
    return entries;
  }, [transactions, installments, month]);
  const balance = sum(rows.map((row) => row.amount));

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Fluxo de caixa</CardTitle>
            <CardDescription>Cada linha mostra somente o movimento que realmente entrou ou saiu.</CardDescription>
          </div>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Mês
            <input type="month" value={month} max={format(new Date(), "yyyy-MM")} onChange={(event) => setMonth(event.target.value)} className="h-11 rounded-2xl border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-[1.4rem] border bg-background/50 p-4 dark:border-white/10 dark:bg-[#0B1220] dark:text-white">
          <div><p className="text-xs text-muted-foreground dark:text-white/50">Resultado do período</p><p className="mt-1 text-2xl font-semibold">{formatCurrency(balance)}</p></div>
          <span className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground dark:border-white/10 dark:bg-white/[0.06] dark:text-white/60">{rows.length} movimentos</span>
        </div>
        {rows.length ? rows.map((row, index) => (
          <div key={`${row.date}-${index}`} className="flex items-center gap-3 rounded-[1.35rem] border bg-card p-3 shadow-[0_8px_24px_rgba(11,18,32,0.04)] sm:p-4">
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", row.amount >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600")}>
              {row.amount >= 0 ? <ArrowDownCircle className="h-5 w-5" /> : <ArrowUpCircle className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{row.description}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{row.category} • {format(parseISO(row.date), "dd MMM yyyy", { locale: ptBR })}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className={cn("text-sm font-semibold tabular-nums sm:text-base", row.amount >= 0 ? "text-emerald-600" : "text-red-600")}>
                {row.amount >= 0 ? "+" : "-"}{formatCurrency(Math.abs(row.amount))}
              </span>
              <p className="mt-1 text-[0.65rem] text-muted-foreground">{row.type === "income" ? "entrada" : "saída"}</p>
            </div>
          </div>
        )) : (
          <div className="rounded-[1.35rem] border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum movimento realizado neste mês.</div>
        )}
      </CardContent>
    </Card>
  );
}

function FinancialResult({
  finance,
  profile,
  avgGross,
  avgNet,
  ticketMonth
}: {
  finance: ReturnType<typeof useFinance>;
  profile: any;
  avgGross: number | null;
  avgNet: number | null;
  ticketMonth: number | null;
}) {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const settledTransactions = finance.transactions.filter((item) => {
    const settled = item.type === "income" ? item.status === "recebido" : item.status === "pago";
    return settled && (item.paid_date ?? item.due_date)?.startsWith(month);
  });
  const receivedInstallments = finance.installments.filter((item) => item.received_amount > 0 && item.received_date?.startsWith(month));
  const expenseGroups = groupByCategory(settledTransactions.filter((item) => item.type === "expense"));
  const incomeGroups = groupByCategory(settledTransactions.filter((item) => item.type === "income"));
  const sales = finance.commissions.filter((item) => item.sale_date?.startsWith(month) && item.status !== "cancelada");
  const salesCount = sales.length;
  const totalExpenses = sum(settledTransactions.filter((item) => item.type === "expense").map((item) => item.amount));
  const totalIncome = sum(settledTransactions.filter((item) => item.type === "income").map((item) => item.amount)) + sum(receivedInstallments.map((item) => item.received_amount));
  const result = totalIncome - totalExpenses;
  const vgv = sum(sales.map((item) => item.vgv));
  const filteredAvgGross = salesCount ? sum(sales.map((item) => item.gross_commission)) / salesCount : null;
  const filteredAvgNet = salesCount ? sum(sales.map((item) => item.net_commission)) / salesCount : null;
  const filteredTicket = salesCount ? vgv / salesCount : null;
  const costPerSale = salesCount ? totalExpenses / salesCount : null;
  const visits = 0;
  const captures = 0;
  const leads = 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Resultado do mês
          <input type="month" value={month} max={format(new Date(), "yyyy-MM")} onChange={(event) => setMonth(event.target.value)} className="h-11 rounded-2xl border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
        </label>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>DRE simplificada do corretor</CardTitle>
          <CardDescription>{format(parseISO(`${month}-01`), "MMMM 'de' yyyy", { locale: ptBR })}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DreSection title="Receitas" groups={incomeGroups} />
          {receivedInstallments.length > 0 && <DataLine label="Comissões recebidas" value={formatCurrency(sum(receivedInstallments.map((item) => item.received_amount)))} />}
          <DreSection title="Despesas" groups={expenseGroups} negative />
          <div className="rounded-3xl border bg-background/50 p-5 dark:border-white/10 dark:bg-[#050403] dark:text-white">
            <p className="text-sm text-muted-foreground dark:text-white/60">Resultado líquido</p>
            <p className="mt-1 text-3xl font-semibold">{formatCurrency(result)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custo da operação</CardTitle>
          <CardDescription>Indicadores calculados somente com dados suficientes.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <DataLine label="Custo total do mês" value={formatCurrency(totalExpenses)} />
          <DataLine label="Custo por venda" value={costPerSale === null ? "Dados insuficientes para calcular." : formatCurrency(costPerSale)} />
          <DataLine label="Custo por lead" value={leads ? formatCurrency(totalExpenses / leads) : "Dados insuficientes para calcular."} />
          <DataLine label="Custo por visita" value={visits ? formatCurrency(totalExpenses / visits) : "Dados insuficientes para calcular."} />
          <DataLine label="Custo por captação" value={captures ? formatCurrency(totalExpenses / captures) : "Dados insuficientes para calcular."} />
          <DataLine label="VGV mês" value={formatCurrency(vgv)} />
          <DataLine label="Meta VGV" value={formatCurrency(profile?.meta_vgv_mensal ?? 0)} />
          <DataLine label="Comissão média bruta" value={filteredAvgGross === null ? "Dados insuficientes para calcular." : formatCurrency(filteredAvgGross)} />
          <DataLine label="Comissão média líquida" value={filteredAvgNet === null ? "Dados insuficientes para calcular." : formatCurrency(filteredAvgNet)} />
          <DataLine label="Ticket médio" value={filteredTicket === null ? "Dados insuficientes para calcular." : formatCurrency(filteredTicket)} />
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

function FinancialCalendar({ transactions, installments }: { transactions: FinancialTransaction[]; installments: CommissionInstallment[] }) {
  const upcoming = [
    ...transactions.map((item) => ({ date: item.due_date ?? item.paid_date ?? "", label: item.description, value: item.amount, type: item.type })),
    ...installments.map((item) => ({ date: item.due_date, label: `Comissão parcela ${item.installment_number}`, value: installmentBalance(item), type: "income" }))
  ]
    .filter((item) => item.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 18);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendário financeiro</CardTitle>
        <CardDescription>Vencimentos, recebimentos e despesas recorrentes em ordem de data.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {upcoming.map((item, index) => (
          <div key={`${item.date}-${index}`} className="rounded-3xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{item.date}</span>
              <span className={cn("text-sm font-semibold", item.type === "income" ? "text-emerald-600" : "text-red-600")}>{formatCurrency(item.value)}</span>
            </div>
            <p className="mt-3 truncate font-medium">{item.label}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TransactionForm({ type, settlement = "paid", onSaved }: { type: "income" | "expense"; settlement?: "paid" | "pending"; onSaved: () => void }) {
  const finance = useFinance();
  const { toast } = useToast();
  const storageKey = `mv-broker-${type}-categories`;
  const usageKey = `mv-broker-${type}-category-usage`;
  const baseCategories = type === "income" ? incomeCategories : expenseCategories;
  const isPayable = type === "expense" && settlement === "pending";
  const [category, setCategory] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? "[]") as string[];
    } catch {
      return [];
    }
  });
  const [categoryUsage, setCategoryUsage] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem(usageKey) ?? "{}") as Record<string, number>;
    } catch {
      return {};
    }
  });
  const categories = useMemo(() => {
    const transactionUsage = finance.transactions
      .filter((item) => item.type === type)
      .reduce<Record<string, number>>((counts, item) => {
        const key = item.category.toLocaleLowerCase("pt-BR");
        counts[key] = (counts[key] ?? 0) + 1;
        return counts;
      }, {});
    return Array.from(new Set([...baseCategories, ...customCategories])).sort((a, b) => {
      const aKey = a.toLocaleLowerCase("pt-BR");
      const bKey = b.toLocaleLowerCase("pt-BR");
      const aScore = (transactionUsage[aKey] ?? 0) * 10 + (categoryUsage[aKey] ?? 0);
      const bScore = (transactionUsage[bKey] ?? 0) * 10 + (categoryUsage[bKey] ?? 0);
      if (aScore !== bScore) return bScore - aScore;
      const aIndex = baseCategories.indexOf(a);
      const bIndex = baseCategories.indexOf(b);
      if (aIndex !== bIndex) return (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex);
      return a.localeCompare(b, "pt-BR");
    });
  }, [baseCategories, categoryUsage, customCategories, finance.transactions, type]);

  useEffect(() => {
    if (!category && categories[0]) setCategory(categories[0]);
  }, [categories, category]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(customCategories));
  }, [customCategories, storageKey]);

  useEffect(() => {
    localStorage.setItem(usageKey, JSON.stringify(categoryUsage));
  }, [categoryUsage, usageKey]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedCategory = String(form.get("category") || "").trim() || "outro";
    if (!categories.some((item) => item.toLowerCase() === selectedCategory.toLowerCase())) {
      const nextCustomCategories = [...customCategories, selectedCategory];
      setCustomCategories(nextCustomCategories);
      localStorage.setItem(storageKey, JSON.stringify(nextCustomCategories));
    }
    await finance.createTransaction.mutateAsync({
      type,
      amount: Number(form.get("amount") || 0),
      category: selectedCategory,
      description: selectedCategory,
      due_date: String(form.get("date") || format(new Date(), "yyyy-MM-dd")),
      paid_date: type === "income" || !isPayable ? String(form.get("date") || format(new Date(), "yyyy-MM-dd")) : null,
      status: type === "income" ? "recebido" : isPayable ? "pendente" : "pago",
      payment_method: String(form.get("payment_method") || "PIX"),
      notes: String(form.get("notes") || "") || null,
      is_recurring: form.get("is_recurring") === "on",
      recurrence_rule: String(form.get("recurrence_rule") || "") || null
    });
    const normalizedCategory = selectedCategory.toLocaleLowerCase("pt-BR");
    const nextUsage = { ...categoryUsage, [normalizedCategory]: (categoryUsage[normalizedCategory] ?? 0) + 1 };
    setCategoryUsage(nextUsage);
    localStorage.setItem(usageKey, JSON.stringify(nextUsage));
    toast({ title: type === "income" ? "Receita salva." : isPayable ? "Conta a pagar cadastrada." : "Despesa paga registrada." });
    onSaved();
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="amount" label="Valor" type="number" step="0.01" required />
        <Field name="date" label={type === "income" ? "Data do recebimento" : isPayable ? "Vencimento" : "Data do pagamento"} type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={`${type}-category`}>Categoria</Label>
          <span className="text-[11px] text-muted-foreground">Mais usadas primeiro</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(showAllCategories ? categories : categories.slice(0, 8)).map((item) => (
            <button
              key={item}
              type="button"
              title={item}
              aria-pressed={category.toLocaleLowerCase("pt-BR") === item.toLocaleLowerCase("pt-BR")}
              onClick={() => setCategory(item)}
              className={cn(
                "min-h-11 min-w-0 truncate rounded-xl border px-2.5 text-left text-xs font-semibold transition sm:text-sm",
                category.toLocaleLowerCase("pt-BR") === item.toLocaleLowerCase("pt-BR") ? "border-primary bg-primary/12 text-primary ring-1 ring-primary/40" : "bg-card hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              {item}
            </button>
          ))}
        </div>
        {categories.length > 8 && <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setShowAllCategories((current) => !current)}>{showAllCategories ? "Mostrar principais" : `Ver todas as ${categories.length} categorias`}</Button>}
        <Label htmlFor={`${type}-category`} className="pt-1 text-xs text-muted-foreground">Outra categoria</Label>
        <Input
          id={`${type}-category`}
          name="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder={type === "income" ? "Ex.: comissão, indicação..." : "Ex.: combustível, anúncios..."}
          required
        />
        <p className="text-xs text-muted-foreground">Ao digitar um novo nome, a categoria ficará salva para os próximos lançamentos.</p>
      </div>
      <div className="space-y-2">
        <Label>Forma de pagamento</Label>
        <Select name="payment_method" defaultValue="PIX">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{paymentMethods.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <details className="rounded-2xl border p-4">
        <summary className="cursor-pointer text-sm font-semibold">Mais opções</summary>
        <div className="mt-4 grid gap-3">
          <Textarea name="notes" placeholder="Observações" />
          {type === "expense" && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input name="is_recurring" type="checkbox" />
                Despesa recorrente
              </label>
              <Select name="recurrence_rule" defaultValue="mensal">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">mensal</SelectItem>
                  <SelectItem value="trimestral">trimestral</SelectItem>
                  <SelectItem value="semestral">semestral</SelectItem>
                  <SelectItem value="anual">anual</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </details>
      <Button>Salvar</Button>
    </form>
  );
}

export function CommissionForm({ onSaved }: { onSaved: () => void }) {
  const finance = useFinance();
  const { toast } = useToast();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const vgv = Number(form.get("vgv") || 0);
    const totalPercent = Number(form.get("total_commission_percent") || 0);
    const brokerPercent = Number(form.get("broker_percent") || 100);
    const gross = Number(form.get("gross_commission") || (vgv * totalPercent) / 100);
    const brokerCommission = (gross * brokerPercent) / 100;
    const discounts = Number(form.get("discounts") || 0);
    const partnerSplit = Number(form.get("partner_split") || 0);
    const net = Math.max(brokerCommission - discounts - partnerSplit, 0);
    await finance.createCommission.mutateAsync({
      client: String(form.get("client") || ""),
      property: String(form.get("property") || ""),
      development: String(form.get("development") || "") || null,
      builder: String(form.get("builder") || "") || null,
      sale_date: String(form.get("sale_date") || format(new Date(), "yyyy-MM-dd")),
      vgv,
      total_commission_percent: totalPercent,
      gross_commission: gross,
      broker_percent: brokerPercent,
      broker_commission: brokerCommission,
      discounts,
      partner_split: partnerSplit,
      net_commission: net,
      installments_count: Number(form.get("installments_count") || 1),
      first_expected_date: String(form.get("first_expected_date") || format(new Date(), "yyyy-MM-dd")),
      notes: String(form.get("notes") || "") || null,
      status: String(form.get("status") || "confirmada") as Commission["status"]
    });
    toast({ title: "Comissão cadastrada com parcelas geradas." });
    onSaved();
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-2">
        <Field name="client" label="Cliente" required />
        <Field name="property" label="Imóvel" required />
        <Field name="development" label="Empreendimento" />
        <Field name="builder" label="Construtora" />
        <Field name="sale_date" label="Data da venda" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} />
        <Field name="vgv" label="VGV" type="number" step="0.01" required />
        <Field name="total_commission_percent" label="% comissão total" type="number" step="0.01" defaultValue="4" />
        <Field name="gross_commission" label="Comissão bruta" type="number" step="0.01" />
        <Field name="broker_percent" label="% do corretor" type="number" step="0.01" defaultValue="100" />
        <Field name="discounts" label="Descontos" type="number" step="0.01" defaultValue="0" />
        <Field name="partner_split" label="Divisão parceiro" type="number" step="0.01" defaultValue="0" />
        <Field name="installments_count" label="Número de parcelas" type="number" defaultValue="1" />
        <Field name="first_expected_date" label="1º recebimento" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select name="status" defaultValue="confirmada">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["estimada", "em negociação", "confirmada", "parcialmente recebida", "recebida", "atrasada", "cancelada"].map((item) => (
              <SelectItem key={item} value={item}>{item}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Textarea name="notes" placeholder="Observações sobre pagamento, condição ou construtora" />
      <Button>Salvar comissão</Button>
    </form>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, name, ...inputProps } = props;
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...inputProps} />
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background/45 p-3 sm:rounded-3xl sm:p-4 dark:border-white/10 dark:bg-white/[0.06]">
      <p className="text-xs text-muted-foreground dark:text-white/55">{label}</p>
      <p className="mt-1 text-lg font-semibold sm:text-xl">{value}</p>
    </div>
  );
}

function FinanceCard({ label, value, icon: Icon, onClick, featured }: { label: string; value: string; icon: React.ElementType; onClick?: () => void; featured?: boolean }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "motion-rise min-h-[116px] rounded-3xl border bg-card p-4 text-left text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition duration-300 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_12px_30px_rgba(16,24,40,0.08)] dark:border-primary/20 dark:bg-[linear-gradient(135deg,#05070b,#11151d)] dark:text-white dark:shadow-[0_24px_60px_rgba(0,0,0,0.24)]",
        featured && "border-primary/45 bg-primary/[0.035] sm:col-span-2 xl:col-span-1 dark:bg-[linear-gradient(135deg,#05070b,#11151d)]"
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <Icon className="h-5 w-5 text-primary" />
        {featured && <span className="rounded-full border border-primary/25 bg-primary/15 px-2.5 py-1 text-[0.68rem] font-semibold text-primary">mês</span>}
      </div>
      <p className="text-xs text-muted-foreground dark:text-white/52">{label}</p>
      <p className={cn("mt-1 font-semibold", featured ? "text-2xl" : "text-xl")}>{value}</p>
    </Comp>
  );
}

function ForecastItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-background/40 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{formatCurrency(value)}</p>
    </div>
  );
}

function ProjectionCard({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={cn("rounded-3xl border p-4", muted ? "bg-muted/60" : "bg-card")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{formatCurrency(value)}</p>
    </div>
  );
}

function DreamGoalsCard() {
  const goals = [
    { label: "Viagem nas férias", target: 18000, saved: 4200, icon: Plane },
    { label: "Carro novo", target: 95000, saved: 18500, icon: Car },
    { label: "Meu imóvel", target: 280000, saved: 36000, icon: Home }
  ];

  return (
    <Card className="overflow-hidden border-border bg-card text-foreground dark:border-primary/25 dark:bg-[linear-gradient(135deg,#05070b,#11151d)] dark:text-white">
      <CardHeader>
        <CardTitle>Metas de conquista</CardTitle>
        <CardDescription>Viagem, carro ou imóvel conectados ao foco financeiro.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {goals.map((goal) => {
          const progress = clampPercent((goal.saved / goal.target) * 100);
          const Icon = goal.icon;
          return (
            <div key={goal.label} className="rounded-2xl border bg-background/45 p-3 dark:border-white/10 dark:bg-white/[0.055]">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate text-sm font-semibold">{goal.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} />
              <p className="mt-2 text-xs text-muted-foreground">{formatCurrency(goal.saved)} guardados de {formatCurrency(goal.target)}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ExpenseAIReport({ transactions }: { transactions: FinancialTransaction[] }) {
  const expenses = transactions.filter((item) => item.type === "expense");
  const paid = expenses.filter((item) => item.status === "pago");
  const pending = expenses.filter((item) => item.status !== "pago" && item.status !== "cancelado");
  const totalPaid = sum(paid.map((item) => item.amount));
  const categoryGroups = groupByCategory(paid);
  const topEntry = Object.entries(categoryGroups).sort((a, b) => b[1] - a[1])[0];
  const topPercent = topEntry && totalPaid ? clampPercent((topEntry[1] / totalPaid) * 100) : 0;
  const marketing = paid.filter((item) => ["anúncios", "tráfego pago", "Instagram", "portais imobiliários"].includes(item.category));
  const marketingTotal = sum(marketing.map((item) => item.amount));

  const insights = [
    !paid.length ? "Ainda não há despesas pagas suficientes para uma análise confiável." : null,
    topEntry ? `${topEntry[0]} concentra ${topPercent}% das despesas pagas. Vale revisar se esse gasto está trazendo visitas, leads ou vendas.` : null,
    pending.length ? `Existem ${pending.length} despesa(s) pendente(s). Priorize as que vencem primeiro para evitar atrasos.` : null,
    marketingTotal ? `Marketing consumiu ${formatCurrency(marketingTotal)}. Compare esse valor com leads recebidos e visitas agendadas antes de aumentar orçamento.` : null,
    paid.length ? "Sugestão: registre toda despesa no mesmo dia para o resultado líquido ficar confiável no fim do mês." : null
  ].filter(Boolean);

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="border-b bg-card">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Relatório de despesas com IA</CardTitle>
        </div>
        <CardDescription>Análise assistida por regras locais. Pronta para conectar uma IA real no futuro.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => (
          <div key={insight} className="rounded-2xl border bg-muted/55 p-3 text-sm leading-6 text-muted-foreground">
            {insight}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MiniBarChart({ income, expenses }: { income: number; expenses: number }) {
  const max = Math.max(income, expenses, 1);
  return (
    <div className="space-y-4">
      <Bar label="Receitas" value={income} max={max} tone="income" />
      <Bar label="Despesas" value={expenses} max={max} tone="expense" />
      <Bar label="Resultado líquido" value={income - expenses} max={max} tone="net" />
    </div>
  );
}

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone: "income" | "expense" | "net" }) {
  const width = clampPercent((Math.abs(value) / max) * 100);
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span>{label}</span>
        <strong>{formatCurrency(value)}</strong>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", tone === "income" ? "bg-emerald-500" : tone === "expense" ? "bg-red-500" : "bg-primary")} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function AlertLine({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border bg-background/45 p-3 text-sm dark:border-white/10 dark:bg-white/5">
      <AlertTriangle className="h-4 w-4 shrink-0 text-primary" />
      <span className="text-muted-foreground dark:text-white/76">{text}</span>
    </div>
  );
}

function GoalProgress({ label, value, target, progress }: { label: string; value: number; target: number; progress: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span>{label}</span>
        <strong>{formatCurrency(value)} / {formatCurrency(target)}</strong>
      </div>
      <Progress value={progress} />
      <p className="mt-1 text-xs text-muted-foreground">{progress}%</p>
    </div>
  );
}

function DataLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-2xl bg-muted p-3 text-sm sm:flex sm:items-start sm:justify-between sm:gap-3">
      <span className="text-muted-foreground">{label}</span>
      <strong className="sm:text-right">{value}</strong>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = status.includes("receb") || status === "pago" ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : status.includes("atras") ? "bg-red-500/12 text-red-700 dark:text-red-300" : status.includes("negociação") || status.includes("estimada") ? "bg-amber-500/12 text-amber-700 dark:text-amber-300" : "bg-primary/12 text-primary";
  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", tone)}>{status}</span>;
}

function InstallmentCard({ installment, onReceive }: { installment: CommissionInstallment; onReceive: () => void }) {
  return (
    <div className="min-w-[230px] rounded-2xl bg-muted p-3 md:min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{installment.installment_number}ª parcela</span>
        <StatusBadge status={installment.status} />
      </div>
      <p className="mt-2 font-semibold">{formatCurrency(installment.expected_amount)}</p>
      <p className="text-xs text-muted-foreground">Vence {installment.due_date}</p>
      <p className="text-xs text-muted-foreground">Saldo {formatCurrency(installmentBalance(installment))}</p>
      {installment.status !== "recebida" && (
        <Button size="sm" className="mt-3 min-h-10 w-full" onClick={onReceive}>
          Receber
        </Button>
      )}
    </div>
  );
}

function MiniAmount({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-2xl bg-muted p-2.5 sm:p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold sm:text-base">{formatCurrency(value)}</p>
    </div>
  );
}

function DreSection({ title, groups, negative }: { title: string; groups: Record<string, number>; negative?: boolean }) {
  return (
    <div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <div className="space-y-2">
        {Object.keys(groups).length ? (
          Object.entries(groups).map(([category, value]) => (
            <div key={category} className="flex justify-between rounded-2xl bg-muted p-3 text-sm">
              <span>{category}</span>
              <strong>{negative ? "-" : ""}{formatCurrency(value)}</strong>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed p-3 text-sm text-muted-foreground">Sem lançamentos.</div>
        )}
      </div>
    </div>
  );
}

function groupByCategory(transactions: FinancialTransaction[]) {
  return transactions.reduce<Record<string, number>>((acc, item) => {
    const active = item.status === "pago" || item.status === "recebido";
    if (!active) return acc;
    acc[item.category] = (acc[item.category] ?? 0) + item.amount;
    return acc;
  }, {});
}

function toCsv(rows: unknown[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0] as Record<string, unknown>);
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((row) => keys.map((key) => escape((row as Record<string, unknown>)[key])).join(","))].join("\n");
}
