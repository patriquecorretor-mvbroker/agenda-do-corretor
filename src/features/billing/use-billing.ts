import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-context";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";

export type BillingCycle = "monthly" | "annual";
export type BillingRequestAction = "subscribe" | "change_plan" | "cancel" | "reactivate";
export type BillingPlan = { id: string; name: string; slug: string; description: string; monthly_price: number; annual_price: number; features: string[]; active: boolean };
export type BillingPayment = { id: string; amount: number; due_date: string; paid_at: string | null; status: "pending" | "paid" | "overdue" | "refunded" | "canceled"; payment_method: string | null };
export type BillingRequest = { id: string; plan_id: string | null; action: BillingRequestAction; billing_cycle: BillingCycle; status: "pending" | "processing" | "completed" | "failed" | "canceled"; created_at: string };

const demoPlans: BillingPlan[] = [
  { id: "plan-essencial", name: "Essencial", slug: "essencial", description: "Agenda, clientes, foco e arquivos para a rotina individual.", monthly_price: 49.9, annual_price: 499, active: true, features: ["Agenda", "Clientes", "Foco", "Materiais", "Meus Arquivos"] },
  { id: "plan-profissional", name: "Profissional", slug: "profissional", description: "Financeiro, metas e inteligência do litoral para o corretor.", monthly_price: 89.9, annual_price: 899, active: true, features: ["Tudo do Essencial", "Financeiro", "Metas", "Edifícios", "Condomínios", "Mercado", "Mídia da Cidade"] }
];
const requestKey = "agenda-demo-billing-requests";

function readRequests(): BillingRequest[] { try { return JSON.parse(localStorage.getItem(requestKey) ?? "[]") as BillingRequest[]; } catch { return []; } }

export function useBilling() {
  const { user, isDemo } = useAuth();
  const queryClient = useQueryClient();
  const key = ["billing", user?.id];
  const query = useQuery({ queryKey: key, enabled: Boolean(user), queryFn: async () => {
    if (!hasSupabaseConfig) return { plans: demoPlans, subscription: { plan_id: "plan-profissional", status: "active", billing_cycle: "monthly", trial_ends_at: null, current_period_end: null }, payments: [] as BillingPayment[], requests: readRequests(), providerReady: false };
    const db = requireSupabase() as any;
    const [plans, subscription, payments, requests] = await Promise.all([
      db.from("subscription_plans").select("id,name,slug,description,monthly_price,annual_price,features,active").eq("active", true).order("monthly_price"),
      db.from("subscriptions").select("plan_id,status,billing_cycle,trial_ends_at,current_period_end,provider").eq("user_id", user!.id).maybeSingle(),
      db.from("subscription_payments").select("id,amount,due_date,paid_at,status,payment_method").eq("user_id", user!.id).order("due_date", { ascending: false }).limit(12),
      db.from("billing_requests").select("id,plan_id,action,billing_cycle,status,created_at").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(10)
    ]);
    for (const result of [plans, subscription, payments, requests]) if (result.error) throw result.error;
    return { plans: plans.data as BillingPlan[], subscription: subscription.data, payments: payments.data as BillingPayment[], requests: requests.data as BillingRequest[], providerReady: Boolean(subscription.data?.provider) };
  }});

  const createRequest = useMutation({ mutationFn: async (input: { action: BillingRequestAction; planId?: string | null; billingCycle: BillingCycle }) => {
    const now = new Date().toISOString();
    const request = { id: crypto.randomUUID(), plan_id: input.planId ?? null, action: input.action, billing_cycle: input.billingCycle, status: "pending" as const, created_at: now };
    if (!hasSupabaseConfig) { localStorage.setItem(requestKey, JSON.stringify([request, ...readRequests()])); return request; }
    const { data, error } = await (requireSupabase() as any).from("billing_requests").insert({ user_id: user!.id, plan_id: input.planId ?? null, action: input.action, billing_cycle: input.billingCycle, idempotency_key: `${input.action}:${input.planId ?? "none"}:${Date.now()}` }).select("id,plan_id,action,billing_cycle,status,created_at").single();
    if (error) throw error;
    return data as BillingRequest;
  }, onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) });

  return { ...query, data: query.data ?? { plans: demoPlans, subscription: null, payments: [], requests: [], providerReady: false }, createRequest, isDemo };
}
