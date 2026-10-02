import { addDays, addMonths, differenceInCalendarDays, endOfMonth, format, isAfter, isBefore, isSameMonth, parseISO, startOfMonth } from "date-fns";
import type { Commission, CommissionInstallment, FinancialTransaction, MonthlyBudget } from "@/types/database";

export const expenseCategories = [
  "MV Broker",
  "combustível",
  "estacionamento",
  "pedágio",
  "veículo",
  "manutenção",
  "fotografia",
  "material extra",
  "placas e faixas",
  "chaves e cópias",
  "brindes para clientes",
  "documentação",
  "vídeo",
  "drone",
  "anúncios",
  "tráfego pago",
  "Instagram",
  "portais imobiliários",
  "CRM",
  "telefone",
  "internet",
  "escritório",
  "coworking",
  "limpeza de imóvel",
  "produção de conteúdo",
  "uniforme",
  "alimentação",
  "deslocamento",
  "hospedagem",
  "cursos",
  "ferramentas",
  "assinaturas",
  "comissão para parceiro",
  "impostos",
  "contador",
  "outros"
];

export const incomeCategories = ["comissão", "indicação", "parceria", "consultoria", "serviço", "bônus", "honorário", "outro"];
export const paymentMethods = ["PIX", "dinheiro", "transferência", "boleto", "cartão", "cheque", "outro"];

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function installmentBalance(installment: CommissionInstallment) {
  return Math.max(installment.expected_amount - installment.received_amount, 0);
}

export function isReceivedTransaction(transaction: FinancialTransaction) {
  return transaction.type === "income" && transaction.status === "recebido";
}

export function isPaidExpense(transaction: FinancialTransaction) {
  return transaction.type === "expense" && transaction.status === "pago";
}

export function monthBounds(date = new Date()) {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
    monthKey: format(date, "yyyy-MM-01")
  };
}

export function financeMetrics({
  commissions,
  installments,
  transactions,
  budgets
}: {
  commissions: Commission[];
  installments: CommissionInstallment[];
  transactions: FinancialTransaction[];
  budgets: MonthlyBudget[];
}) {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const { start, end, monthKey } = monthBounds(now);

  const monthTransactions = transactions.filter((item) => {
    const date = item.paid_date ?? item.due_date;
    return date ? isSameMonth(parseISO(date), now) : false;
  });
  const monthCommissions = commissions.filter((item) => (item.sale_date ? isSameMonth(parseISO(item.sale_date), now) : false));
  const receivedInstallments = installments.filter((item) => item.status === "recebida" || item.status === "parcialmente recebida");
  const receivedThisMonth = receivedInstallments.filter((item) => item.received_date && isSameMonth(parseISO(item.received_date), now));
  const confirmedReceivable = installments.filter((item) => ["confirmada", "prevista", "parcialmente recebida", "atrasada"].includes(item.status));
  const potentialCommissions = commissions.filter((item) => item.status === "estimada" || item.status === "em negociação");
  const overdueInstallments = installments.filter(
    (item) => !["recebida", "cancelada"].includes(item.status) && isBefore(parseISO(item.due_date), startOfDayDate(now))
  );

  const incomeMonth = sum(monthTransactions.filter(isReceivedTransaction).map((item) => item.amount)) + sum(receivedThisMonth.map((item) => item.received_amount));
  const expensesMonth = sum(monthTransactions.filter(isPaidExpense).map((item) => item.amount));
  const vgvMonth = sum(monthCommissions.filter((item) => item.status !== "cancelada").map((item) => item.vgv));
  const receivedToday =
    sum(installments.filter((item) => item.due_date === today && item.status !== "cancelada").map(installmentBalance)) +
    sum(transactions.filter((item) => item.type === "income" && item.due_date === today && item.status !== "recebido").map((item) => item.amount));
  const payToday = sum(transactions.filter((item) => item.type === "expense" && item.due_date === today && item.status !== "pago").map((item) => item.amount));

  return {
    commissionReceivedMonth: sum(receivedThisMonth.map((item) => item.received_amount)),
    commissionReceivable: sum(confirmedReceivable.map(installmentBalance)),
    commissionPotential: sum(potentialCommissions.map((item) => item.net_commission)),
    incomeMonth,
    expensesMonth,
    netResultMonth: incomeMonth - expensesMonth,
    vgvMonth,
    overdueAccounts: overdueInstallments.length + transactions.filter((item) => item.status === "atrasado").length,
    receiveToday: receivedToday,
    payToday,
    forecast: forecastBuckets(installments),
    budgets: budgets.filter((budget) => budget.month === monthKey),
    monthStart: start,
    monthEnd: end
  };
}

function startOfDayDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function forecastBuckets(installments: CommissionInstallment[]) {
  const now = startOfDayDate(new Date());
  const active = installments.filter((item) => !["recebida", "cancelada"].includes(item.status));
  const byRange = (min: number, max: number) =>
    sum(
      active
        .filter((item) => {
          const days = differenceInCalendarDays(parseISO(item.due_date), now);
          return days >= min && days <= max;
        })
        .map(installmentBalance)
    );

  return {
    today: byRange(0, 0),
    next7: byRange(1, 7),
    next30: byRange(8, 30),
    next60: byRange(31, 60),
    next90: byRange(61, 90),
    after90: sum(active.filter((item) => isAfter(parseISO(item.due_date), addDays(now, 90))).map(installmentBalance))
  };
}

export function buildEqualInstallments({
  commissionId,
  userId,
  total,
  count,
  firstDate
}: {
  commissionId: string;
  userId: string;
  total: number;
  count: number;
  firstDate: string;
}) {
  const rounded = Math.floor((total / count) * 100) / 100;
  return Array.from({ length: count }, (_, index) => {
    const isLast = index === count - 1;
    const expected = isLast ? Number((total - rounded * (count - 1)).toFixed(2)) : rounded;
    return {
      user_id: userId,
      commission_id: commissionId,
      installment_number: index + 1,
      due_date: format(addMonths(parseISO(firstDate), index), "yyyy-MM-dd"),
      expected_amount: expected,
      received_amount: 0,
      received_date: null,
      status: "confirmada" as const,
      payment_method: null,
      notes: null
    };
  });
}
