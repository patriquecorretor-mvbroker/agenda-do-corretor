import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hasSupabaseConfig } from "@/lib/supabase";
import { demoCommissions, demoCommissionInstallments, demoFinancialTransactions, demoMonthlyBudgets } from "@/lib/demo-data";
import { useAuth } from "@/features/auth/auth-context";
import {
  createCommission,
  createCommissionInstallments,
  createFinancialTransaction,
  createFinancialTransactions,
  listCommissionInstallments,
  listCommissions,
  listFinancialTransactions,
  listMonthlyBudgets,
  updateCommission,
  updateCommissionInstallment,
  updateFinancialTransaction,
  type CommissionInsert,
  type FinancialTransactionInsert
} from "@/features/finance/finance-service";
import { buildEqualInstallments, financeMetrics } from "@/features/finance/finance-utils";
import type { Commission, CommissionInstallment, FinancialTransaction } from "@/types/database";

const keys = {
  transactions: "agenda-demo-financial-transactions",
  commissions: "agenda-demo-commissions",
  installments: "agenda-demo-commission-installments",
  budgets: "agenda-demo-monthly-budgets"
};

function readLocal<T>(key: string, fallback: T) {
  const saved = localStorage.getItem(key);
  return saved ? (JSON.parse(saved) as T) : fallback;
}

function writeLocal<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `local-${Date.now()}-${Math.random()}`;
}

export function useFinance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const transactionsQuery = useQuery({
    queryKey: ["finance", "transactions", userId],
    queryFn: () => (hasSupabaseConfig ? listFinancialTransactions(userId!) : readLocal(keys.transactions, demoFinancialTransactions)),
    enabled: Boolean(userId)
  });

  const commissionsQuery = useQuery({
    queryKey: ["finance", "commissions", userId],
    queryFn: () => (hasSupabaseConfig ? listCommissions(userId!) : readLocal(keys.commissions, demoCommissions)),
    enabled: Boolean(userId)
  });

  const installmentsQuery = useQuery({
    queryKey: ["finance", "installments", userId],
    queryFn: () => (hasSupabaseConfig ? listCommissionInstallments(userId!) : readLocal(keys.installments, demoCommissionInstallments)),
    enabled: Boolean(userId)
  });

  const budgetsQuery = useQuery({
    queryKey: ["finance", "budgets", userId],
    queryFn: () => (hasSupabaseConfig ? listMonthlyBudgets(userId!) : readLocal(keys.budgets, demoMonthlyBudgets)),
    enabled: Boolean(userId)
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["finance"] });

  const transactions = transactionsQuery.data ?? [];
  const commissions = commissionsQuery.data ?? [];
  const installments = installmentsQuery.data ?? [];
  const budgets = budgetsQuery.data ?? [];

  return {
    transactions,
    commissions,
    installments,
    budgets,
    metrics: financeMetrics({ commissions, installments, transactions, budgets }),
    isLoading: transactionsQuery.isLoading || commissionsQuery.isLoading || installmentsQuery.isLoading || budgetsQuery.isLoading,
    createTransaction: useMutation({
      mutationFn: async (input: Omit<FinancialTransactionInsert, "user_id">) => {
        if (hasSupabaseConfig) return createFinancialTransaction({ ...input, user_id: userId! });
        const next: FinancialTransaction = {
          id: createId(),
          user_id: userId!,
          type: input.type,
          category: input.category,
          description: input.description,
          amount: input.amount,
          due_date: input.due_date ?? null,
          paid_date: input.paid_date ?? null,
          status: input.status ?? "pendente",
          payment_method: input.payment_method ?? null,
          client_id: input.client_id ?? null,
          property_id: input.property_id ?? null,
          sale_id: input.sale_id ?? null,
          commission_id: input.commission_id ?? null,
          is_recurring: input.is_recurring ?? false,
          recurrence_rule: input.recurrence_rule ?? null,
          notes: input.notes ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        writeLocal(keys.transactions, [...readLocal(keys.transactions, demoFinancialTransactions), next]);
        return next;
      },
      onSuccess: invalidate
    }),
    createTransactions: useMutation({
      mutationFn: async (inputs: Array<Omit<FinancialTransactionInsert, "user_id">>) => {
        if (hasSupabaseConfig) return createFinancialTransactions(inputs.map((input) => ({ ...input, user_id: userId! })));
        const created = inputs.map((input) => ({
          id: createId(),
          user_id: userId!,
          type: input.type,
          category: input.category,
          description: input.description,
          amount: input.amount,
          due_date: input.due_date ?? null,
          paid_date: input.paid_date ?? null,
          status: input.status ?? "pendente",
          payment_method: input.payment_method ?? null,
          client_id: input.client_id ?? null,
          property_id: input.property_id ?? null,
          sale_id: input.sale_id ?? null,
          commission_id: input.commission_id ?? null,
          is_recurring: input.is_recurring ?? false,
          recurrence_rule: input.recurrence_rule ?? null,
          notes: input.notes ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })) as FinancialTransaction[];
        writeLocal(keys.transactions, [...readLocal(keys.transactions, demoFinancialTransactions), ...created]);
        return created;
      },
      onSuccess: invalidate
    }),
    updateTransaction: useMutation({
      mutationFn: async ({ id, input }: { id: string; input: Partial<FinancialTransaction> }) => {
        if (hasSupabaseConfig) return updateFinancialTransaction(id, userId!, input);
        let updated = transactions.find((item) => item.id === id);
        const next = readLocal(keys.transactions, demoFinancialTransactions).map((item) => {
          if (item.id !== id) return item;
          updated = { ...item, ...input, updated_at: new Date().toISOString() };
          return updated;
        });
        writeLocal(keys.transactions, next);
        return updated!;
      },
      onSuccess: invalidate
    }),
    createCommission: useMutation({
      mutationFn: async (input: Omit<CommissionInsert, "user_id">) => {
        if (hasSupabaseConfig) {
          const commission = await createCommission({ ...input, user_id: userId! });
          if (commission.first_expected_date && commission.installments_count > 0) {
            await createCommissionInstallments(
              buildEqualInstallments({
                commissionId: commission.id,
                userId: userId!,
                total: commission.net_commission,
                count: commission.installments_count,
                firstDate: commission.first_expected_date
              })
            );
          }
          return commission;
        }
        const commission: Commission = {
          id: createId(),
          user_id: userId!,
          sale_id: input.sale_id ?? null,
          client: input.client ?? null,
          property: input.property ?? null,
          development: input.development ?? null,
          builder: input.builder ?? null,
          sale_date: input.sale_date ?? null,
          vgv: input.vgv ?? 0,
          total_commission_percent: input.total_commission_percent ?? 0,
          gross_commission: input.gross_commission ?? 0,
          broker_percent: input.broker_percent ?? 100,
          broker_commission: input.broker_commission ?? 0,
          discounts: input.discounts ?? 0,
          partner_split: input.partner_split ?? 0,
          net_commission: input.net_commission ?? 0,
          installments_count: input.installments_count ?? 1,
          first_expected_date: input.first_expected_date ?? null,
          notes: input.notes ?? null,
          status: input.status ?? "estimada",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        writeLocal(keys.commissions, [...readLocal(keys.commissions, demoCommissions), commission]);
        if (commission.first_expected_date) {
          const localInstallments = buildEqualInstallments({
            commissionId: commission.id,
            userId: userId!,
            total: commission.net_commission,
            count: commission.installments_count,
            firstDate: commission.first_expected_date
          }).map((item) => ({
            ...item,
            id: createId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })) as CommissionInstallment[];
          writeLocal(keys.installments, [...readLocal(keys.installments, demoCommissionInstallments), ...localInstallments]);
        }
        return commission;
      },
      onSuccess: invalidate
    }),
    updateCommission: useMutation({
      mutationFn: async ({ id, input }: { id: string; input: Partial<Commission> }) => {
        if (hasSupabaseConfig) return updateCommission(id, userId!, input);
        let updated = commissions.find((item) => item.id === id);
        const next = readLocal(keys.commissions, demoCommissions).map((item) => {
          if (item.id !== id) return item;
          updated = { ...item, ...input, updated_at: new Date().toISOString() };
          return updated;
        });
        writeLocal(keys.commissions, next);
        return updated!;
      },
      onSuccess: invalidate
    }),
    updateInstallment: useMutation({
      mutationFn: async ({ id, input }: { id: string; input: Partial<CommissionInstallment> }) => {
        if (hasSupabaseConfig) return updateCommissionInstallment(id, userId!, input);
        let updated = installments.find((item) => item.id === id);
        const next = readLocal(keys.installments, demoCommissionInstallments).map((item) => {
          if (item.id !== id) return item;
          updated = { ...item, ...input, updated_at: new Date().toISOString() };
          return updated;
        });
        writeLocal(keys.installments, next);
        return updated!;
      },
      onSuccess: invalidate
    })
  };
}
