import { useMemo, useState } from "react";
import { addDays, format, isSameMonth, parseISO } from "date-fns";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CalendarDays,
  Download,
  LineChart,
  Plus,
  Receipt,
  Search,
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
import { expenseCategories, incomeCategories, installmentBalance, paymentMethods, sum } from "@/features/finance/finance-utils";
import { useFinance } from "@/features/finance/use-finance";
import type { Commission, CommissionInstallment, FinancialTransaction } from "@/types/database";

type FinanceTab = "dashboard" | "commissions" | "receivable" | "payable" | "cashflow" | "result" | "calendar";
type FinanceForm = "income" | "expense" | "commission" | null;

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
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] bg-[#050403] text-white shadow-soft">
        <div className="relative p-5 md:p-8">
          <div className="absolute -right-24 -top-28 h-64 w-64 rounded-full bg-primary/35 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-24 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <WalletCards className="h-3.5 w-3.5" />
                Financeiro MV Broker
              </div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">Controle real do dinheiro que entrou, vai entrar e ainda é potencial.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
                Separação clara entre realizado, confirmado, previsto, potencial e atrasado. Sem misturar promessa com caixa.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-[420px]">
              <HeroMetric label="Resultado mês" value={formatCurrency(finance.metrics.netResultMonth)} />
              <HeroMetric label="Receber hoje" value={formatCurrency(finance.metrics.receiveToday)} />
            </div>
          </div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "shrink-0 rounded-2xl border px-4 py-2 text-sm font-semibold transition",
              tab === item.id ? "border-primary bg-primary text-primary-foreground shadow-soft" : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <FinanceCard label="Comissão recebida" value={formatCurrency(finance.metrics.commissionReceivedMonth)} icon={Banknote} onClick={() => setTab("commissions")} />
        <FinanceCard label="Comissão a receber" value={formatCurrency(finance.metrics.commissionReceivable)} icon={ArrowDownCircle} onClick={() => setTab("receivable")} />
        <FinanceCard label="Em negociação" value={formatCurrency(finance.metrics.commissionPotential)} icon={TrendingUp} />
        <FinanceCard label="Despesas do mês" value={formatCurrency(finance.metrics.expensesMonth)} icon={ArrowUpCircle} onClick={() => setTab("payable")} />
        <FinanceCard label="VGV do mês" value={formatCurrency(finance.metrics.vgvMonth)} icon={LineChart} />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-11" placeholder="Pesquisar cliente, imóvel, categoria..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex">
          <Button size="sm" onClick={() => setForm("income")}>
            <Plus className="h-4 w-4" />
            Receita
          </Button>
          <Button size="sm" variant="outline" onClick={() => setForm("expense")}>
            <Plus className="h-4 w-4" />
            Despesa
          </Button>
          <Button size="sm" variant="outline" onClick={() => setForm("commission")}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form === "commission" ? "Nova comissão" : form === "expense" ? "Nova despesa" : "Nova receita"}</DialogTitle>
            <DialogDescription>
              {form === "commission" ? "Cadastre venda, comissão e parcelamento automático." : "Cadastro rápido para poucos toques no celular."}
            </DialogDescription>
          </DialogHeader>
          {form === "commission" ? (
            <CommissionForm onSaved={() => setForm(null)} />
          ) : form ? (
            <TransactionForm type={form === "income" ? "income" : "expense"} onSaved={() => setForm(null)} />
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
  onOpen
}: {
  finance: ReturnType<typeof useFinance>;
  profile: any;
  avgGross: number | null;
  avgNet: number | null;
  ticketMonth: number | null;
  onOpen: (tab: FinanceTab) => void;
}) {
  const commissionGoal = profile?.meta_comissao_mensal ?? 0;
  const vgvGoal = profile?.meta_vgv_mensal ?? 0;
  const commissionProgress = commissionGoal ? clampPercent((finance.metrics.commissionReceivedMonth / commissionGoal) * 100) : 0;
  const vgvProgress = vgvGoal ? clampPercent((finance.metrics.vgvMonth / vgvGoal) * 100) : 0;

  return (
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
      </div>

      <div className="space-y-5">
        <Card className="border-primary/25 bg-[#050403] text-white">
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
            <CardDescription className="text-white/65">Pontos que pedem ação.</CardDescription>
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
  );
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
        <Button variant="outline" onClick={onExport}>
          <Download className="h-4 w-4" />
          CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {commissions.map((commission) => {
          const linked = installments.filter((item) => item.commission_id === commission.id);
          return (
            <article key={commission.id} className="rounded-3xl border bg-card p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <StatusBadge status={commission.status} />
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{commission.builder ?? "sem construtora"}</span>
                  </div>
                  <h3 className="text-lg font-semibold">{commission.client ?? "Cliente não informado"}</h3>
                  <p className="text-sm text-muted-foreground">{commission.property ?? commission.development ?? "Imóvel não informado"}</p>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-xs text-muted-foreground">Comissão líquida</p>
                  <p className="text-2xl font-semibold">{formatCurrency(commission.net_commission)}</p>
                  <p className="text-xs text-muted-foreground">VGV {formatCurrency(commission.vgv)}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-3">
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
          <Button variant="outline" onClick={onExport}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {["todos", "hoje", "atrasadas", "7", "30", "recebidas", "pendentes"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onFilter(item)}
              className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-semibold", filter === item ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}
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
            <article key={installment.id} className="grid gap-3 rounded-3xl border p-4 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={installment.status} />
                  <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{installment.due_date}</span>
                </div>
                <h3 className="mt-2 font-semibold">{commission?.client ?? "Comissão"}</h3>
                <p className="text-sm text-muted-foreground">{commission?.property ?? "Origem: comissão"} • parcela {installment.installment_number}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
                <MiniAmount label="Previsto" value={installment.expected_amount} />
                <MiniAmount label="Recebido" value={installment.received_amount} />
                <MiniAmount label="Saldo" value={installmentBalance(installment)} />
              </div>
              {installment.status !== "recebida" && (
                <div className="flex flex-wrap gap-2 lg:col-span-2">
                  <Button size="sm" onClick={() => onReceive(installment)}>
                    Receber integral
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onReceive(installment, Math.round(installment.expected_amount * 0.6))}>
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
        <Button variant="outline" onClick={onExport}>
          <Download className="h-4 w-4" />
          CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((transaction) => (
          <article key={transaction.id} className="grid gap-3 rounded-3xl border p-4 md:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={transaction.status} />
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{transaction.category}</span>
              </div>
              <h3 className="mt-2 font-semibold">{transaction.description}</h3>
              <p className="text-sm text-muted-foreground">Vence {transaction.due_date ?? "sem data"} • {transaction.payment_method ?? "sem forma"}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-2xl font-semibold">{formatCurrency(transaction.amount)}</p>
              {transaction.status !== "pago" && transaction.type === "expense" && (
                <Button size="sm" className="mt-2" onClick={() => onPay(transaction)}>
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
  const rows = useMemo(() => {
    const entries = [
      ...transactions.map((item) => ({
        date: item.paid_date ?? item.due_date ?? format(new Date(), "yyyy-MM-dd"),
        description: item.description,
        in: item.type === "income" ? item.amount : 0,
        out: item.type === "expense" ? item.amount : 0
      })),
      ...installments.map((item) => ({
        date: item.received_date ?? item.due_date,
        description: `Comissão parcela ${item.installment_number}`,
        in: item.received_amount || (item.status === "recebida" ? item.expected_amount : 0),
        out: 0
      }))
    ].sort((a, b) => a.date.localeCompare(b.date));
    let accumulated = 0;
    return entries.map((item) => {
      const balance = item.in - item.out;
      accumulated += balance;
      return { ...item, balance, accumulated };
    });
  }, [transactions, installments]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de caixa</CardTitle>
        <CardDescription>Entrada, saída, saldo diário e saldo acumulado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row, index) => (
          <div key={`${row.date}-${index}`} className="grid gap-2 rounded-2xl border p-3 md:grid-cols-[110px_1fr_repeat(3,120px)] md:items-center">
            <strong>{row.date}</strong>
            <span>{row.description}</span>
            <span className="text-emerald-600">{row.in ? formatCurrency(row.in) : "-"}</span>
            <span className="text-red-600">{row.out ? formatCurrency(row.out) : "-"}</span>
            <span className="font-semibold">{formatCurrency(row.accumulated)}</span>
          </div>
        ))}
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
  const expenseGroups = groupByCategory(finance.transactions.filter((item) => item.type === "expense"));
  const incomeGroups = groupByCategory(finance.transactions.filter((item) => item.type === "income"));
  const salesCount = finance.commissions.filter((item) => item.status === "recebida").length;
  const costPerSale = salesCount ? finance.metrics.expensesMonth / salesCount : null;
  const visits = 0;
  const captures = 0;
  const leads = 0;

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>DRE simplificada do corretor</CardTitle>
          <CardDescription>Mês atual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DreSection title="Receitas" groups={incomeGroups} />
          <DreSection title="Despesas" groups={expenseGroups} negative />
          <div className="rounded-3xl bg-[#050403] p-5 text-white">
            <p className="text-sm text-white/60">Resultado líquido</p>
            <p className="mt-1 text-3xl font-semibold">{formatCurrency(finance.metrics.netResultMonth)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custo da operação</CardTitle>
          <CardDescription>Indicadores calculados somente com dados suficientes.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <DataLine label="Custo total do mês" value={formatCurrency(finance.metrics.expensesMonth)} />
          <DataLine label="Custo por venda" value={costPerSale === null ? "Dados insuficientes para calcular." : formatCurrency(costPerSale)} />
          <DataLine label="Custo por lead" value={leads ? formatCurrency(finance.metrics.expensesMonth / leads) : "Dados insuficientes para calcular."} />
          <DataLine label="Custo por visita" value={visits ? formatCurrency(finance.metrics.expensesMonth / visits) : "Dados insuficientes para calcular."} />
          <DataLine label="Custo por captação" value={captures ? formatCurrency(finance.metrics.expensesMonth / captures) : "Dados insuficientes para calcular."} />
          <DataLine label="VGV mês" value={formatCurrency(finance.metrics.vgvMonth)} />
          <DataLine label="Meta VGV" value={formatCurrency(profile?.meta_vgv_mensal ?? 0)} />
          <DataLine label="Comissão média bruta" value={avgGross === null ? "Dados insuficientes para calcular." : formatCurrency(avgGross)} />
          <DataLine label="Comissão média líquida" value={avgNet === null ? "Dados insuficientes para calcular." : formatCurrency(avgNet)} />
          <DataLine label="Ticket médio" value={ticketMonth === null ? "Dados insuficientes para calcular." : formatCurrency(ticketMonth)} />
        </CardContent>
      </Card>
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
          <div key={`${item.date}-${index}`} className="rounded-3xl border p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{item.date}</span>
              <span className={cn("text-sm font-semibold", item.type === "income" ? "text-emerald-600" : "text-red-600")}>{formatCurrency(item.value)}</span>
            </div>
            <p className="mt-3 font-medium">{item.label}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TransactionForm({ type, onSaved }: { type: "income" | "expense"; onSaved: () => void }) {
  const finance = useFinance();
  const { toast } = useToast();
  const categories = type === "income" ? incomeCategories : expenseCategories;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await finance.createTransaction.mutateAsync({
      type,
      amount: Number(form.get("amount") || 0),
      category: String(form.get("category") || "outro"),
      description: String(form.get("description") || ""),
      due_date: String(form.get("date") || format(new Date(), "yyyy-MM-dd")),
      paid_date: type === "income" ? String(form.get("date") || format(new Date(), "yyyy-MM-dd")) : null,
      status: type === "income" ? "recebido" : "pendente",
      payment_method: String(form.get("payment_method") || "PIX"),
      notes: String(form.get("notes") || "") || null,
      is_recurring: form.get("is_recurring") === "on",
      recurrence_rule: String(form.get("recurrence_rule") || "") || null
    });
    toast({ title: type === "income" ? "Receita salva." : "Despesa salva." });
    onSaved();
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3">
        <Field name="amount" label="Valor" type="number" step="0.01" required />
        <Field name="date" label="Data" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
      </div>
      <div className="space-y-2">
        <Label>Categoria</Label>
        <Select name="category" defaultValue={categories[0]}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Field name="description" label="Descrição" required />
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
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-xs text-white/55">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function FinanceCard({ label, value, icon: Icon, onClick }: { label: string; value: string; icon: React.ElementType; onClick?: () => void }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className="rounded-3xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
      <Icon className="mb-4 h-5 w-5 text-primary" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </Comp>
  );
}

function ForecastItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted p-4">
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
    <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 text-primary" />
      <span className="text-white/76">{text}</span>
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
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-muted p-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = status.includes("receb") || status === "pago" ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : status.includes("atras") ? "bg-red-500/12 text-red-700 dark:text-red-300" : status.includes("negociação") || status.includes("estimada") ? "bg-amber-500/12 text-amber-700 dark:text-amber-300" : "bg-primary/12 text-primary";
  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", tone)}>{status}</span>;
}

function InstallmentCard({ installment, onReceive }: { installment: CommissionInstallment; onReceive: () => void }) {
  return (
    <div className="rounded-2xl bg-muted p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{installment.installment_number}ª parcela</span>
        <StatusBadge status={installment.status} />
      </div>
      <p className="mt-2 font-semibold">{formatCurrency(installment.expected_amount)}</p>
      <p className="text-xs text-muted-foreground">Vence {installment.due_date}</p>
      <p className="text-xs text-muted-foreground">Saldo {formatCurrency(installmentBalance(installment))}</p>
      {installment.status !== "recebida" && (
        <Button size="sm" className="mt-3 w-full" onClick={onReceive}>
          Receber
        </Button>
      )}
    </div>
  );
}

function MiniAmount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{formatCurrency(value)}</p>
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
