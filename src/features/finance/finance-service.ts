import { requireSupabase } from "@/lib/supabase";
import type { Commission, CommissionInstallment, FinancialTransaction, MonthlyBudget } from "@/types/database";

export async function listFinancialTransactions(userId: string) {
  const { data, error } = await (requireSupabase() as any)
    .from("financial_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("due_date", { nullsFirst: false });
  if (error) throw error;
  return data as FinancialTransaction[];
}

export async function createFinancialTransaction(input: FinancialTransactionInsert) {
  const { data, error } = await (requireSupabase() as any).from("financial_transactions").insert(input).select("*").single();
  if (error) throw error;
  return data as FinancialTransaction;
}

export async function updateFinancialTransaction(id: string, userId: string, input: Partial<FinancialTransaction>) {
  const { data, error } = await (requireSupabase() as any)
    .from("financial_transactions")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data as FinancialTransaction;
}

export async function listCommissions(userId: string) {
  const { data, error } = await (requireSupabase() as any)
    .from("commissions")
    .select("*")
    .eq("user_id", userId)
    .order("sale_date", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data as Commission[];
}

export async function createCommission(input: CommissionInsert) {
  const { data, error } = await (requireSupabase() as any).from("commissions").insert(input).select("*").single();
  if (error) throw error;
  return data as Commission;
}

export async function updateCommission(id: string, userId: string, input: Partial<Commission>) {
  const { data, error } = await (requireSupabase() as any)
    .from("commissions")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Commission;
}

export async function listCommissionInstallments(userId: string) {
  const { data, error } = await (requireSupabase() as any)
    .from("commission_installments")
    .select("*")
    .eq("user_id", userId)
    .order("due_date");
  if (error) throw error;
  return data as CommissionInstallment[];
}

export async function createCommissionInstallments(input: CommissionInstallmentInsert[]) {
  const { data, error } = await (requireSupabase() as any).from("commission_installments").insert(input).select("*");
  if (error) throw error;
  return data as CommissionInstallment[];
}

export async function updateCommissionInstallment(id: string, userId: string, input: Partial<CommissionInstallment>) {
  const { data, error } = await (requireSupabase() as any)
    .from("commission_installments")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data as CommissionInstallment;
}

export async function listMonthlyBudgets(userId: string) {
  const { data, error } = await (requireSupabase() as any).from("monthly_budgets").select("*").eq("user_id", userId);
  if (error) throw error;
  return data as MonthlyBudget[];
}

export type FinancialTransactionInsert = Omit<Partial<FinancialTransaction>, "id" | "created_at" | "updated_at"> & {
  user_id: string;
  type: FinancialTransaction["type"];
  category: string;
  description: string;
  amount: number;
};

export type CommissionInsert = Omit<Partial<Commission>, "id" | "created_at" | "updated_at"> & { user_id: string };

export type CommissionInstallmentInsert = Omit<Partial<CommissionInstallment>, "id" | "created_at" | "updated_at"> & {
  user_id: string;
  commission_id: string;
  installment_number: number;
  due_date: string;
  expected_amount: number;
};
