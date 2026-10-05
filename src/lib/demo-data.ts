import type { CalendarEvent, Commission, CommissionInstallment, FinancialTransaction, MonthlyBudget, Task } from "@/types/database";

// The local fallback starts empty so the MVP behaves like a new account.
export const demoEvents: CalendarEvent[] = [];
export const demoTasks: Task[] = [];
export const demoCommissions: Commission[] = [];
export const demoCommissionInstallments: CommissionInstallment[] = [];
export const demoFinancialTransactions: FinancialTransaction[] = [];
export const demoMonthlyBudgets: MonthlyBudget[] = [];
