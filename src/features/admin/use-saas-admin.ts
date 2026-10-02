import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-context";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import type { SubscriptionAccess } from "@/features/admin/subscription-access";
import { readMaterialAsDataUrl, sanitizeMaterialFileName, validateMaterialFile } from "./material-upload";

export type SaasPlan = { id: string; name: string; slug: string; description: string; monthly_price: number; annual_price: number; features: string[]; active: boolean };
export type SaasMember = { id: string; user_id: string; name: string; email: string; city: string; plan_id: string; status: "trialing" | "active" | "past_due" | "suspended" | "canceled"; renewal: string; created_at: string };
export type SaasPayment = { id: string; user_id: string; member_name: string; amount: number; due_date: string; status: "pending" | "paid" | "overdue" | "refunded" | "canceled"; payment_method: string };
export type SaasDeletionRequest = { id: string; user_id: string; email: string; status: "requested" | "in_review" | "completed" | "canceled"; requested_at: string; resolved_at: string | null };
export type SaasMaterial = { id: string; title: string; description: string; category: string; material_type: "image" | "video" | "pdf" | "drive" | "link"; thumbnail_url: string; external_url: string; storage_path: string | null; target_plan_ids: string[]; published: boolean; created_at: string };
export type MaterialInput = Omit<SaasMaterial, "id" | "created_at">;
type AdminData = { isAdmin: boolean; plans: SaasPlan[]; members: SaasMember[]; payments: SaasPayment[]; materials: SaasMaterial[]; deletionRequests: SaasDeletionRequest[] };

const materialsKey = "agenda-saas-materials";
const membersKey = "agenda-saas-members";
const paymentsKey = "agenda-saas-payments";
const plansKey = "agenda-saas-plans";
const deletionRequestKey = "agenda-demo-deletion-request";

const demoPlans: SaasPlan[] = [
  { id: "plan-essencial", name: "Essencial", slug: "essencial", description: "Agenda, clientes e foco comercial.", monthly_price: 49.9, annual_price: 499, active: true, features: ["Agenda", "Clientes", "Foco", "Materiais", "Meus Arquivos"] },
  { id: "plan-profissional", name: "Profissional", slug: "profissional", description: "Gestão comercial e financeira completa.", monthly_price: 89.9, annual_price: 899, active: true, features: ["Agenda", "Clientes", "Foco", "Materiais", "Meus Arquivos", "Financeiro", "Metas", "Edifícios", "Condomínios", "Mercado", "Mídia da Cidade"] },
  { id: "plan-equipe", name: "Equipe", slug: "equipe", description: "Operação para imobiliárias e times.", monthly_price: 169.9, annual_price: 1699, active: true, features: ["Agenda", "Clientes", "Foco", "Materiais", "Meus Arquivos", "Financeiro", "Metas", "Edifícios", "Condomínios", "Mercado", "Mídia da Cidade", "Gestão de equipe", "Suporte prioritário"] }
];
const demoMembers: SaasMember[] = [
  { id: "sub-1", user_id: "demo-user", name: "Patrique Lopes", email: "patrique@mvbroker.com.br", city: "Capão da Canoa", plan_id: "plan-profissional", status: "active", renewal: "2026-10-18", created_at: "2026-06-18" },
  { id: "sub-2", user_id: "member-2", name: "Mariana Costa", email: "mariana@corretora.com.br", city: "Xangri-Lá", plan_id: "plan-essencial", status: "trialing", renewal: "2026-10-07", created_at: "2026-09-23" },
  { id: "sub-3", user_id: "member-3", name: "Lucas Martins", email: "lucas@imoveis.com.br", city: "Capão da Canoa", plan_id: "plan-profissional", status: "past_due", renewal: "2026-09-28", created_at: "2026-04-11" },
  { id: "sub-4", user_id: "member-4", name: "Equipe Costa Norte", email: "contato@costanorte.com.br", city: "Atlântida", plan_id: "plan-equipe", status: "active", renewal: "2026-10-21", created_at: "2026-02-03" }
];
const demoPayments: SaasPayment[] = [
  { id: "pay-1", user_id: "demo-user", member_name: "Patrique Lopes", amount: 89.9, due_date: "2026-09-18", status: "paid", payment_method: "PIX" },
  { id: "pay-2", user_id: "member-2", member_name: "Mariana Costa", amount: 49.9, due_date: "2026-10-07", status: "pending", payment_method: "Cartão" },
  { id: "pay-3", user_id: "member-3", member_name: "Lucas Martins", amount: 89.9, due_date: "2026-09-28", status: "overdue", payment_method: "Boleto" },
  { id: "pay-4", user_id: "member-4", member_name: "Equipe Costa Norte", amount: 169.9, due_date: "2026-09-21", status: "paid", payment_method: "Cartão" }
];
const demoMaterials: SaasMaterial[] = [
  { id: "mat-1", title: "Campanha Vista Mar", description: "Kit de stories e feed para imóveis com vista para o mar.", category: "Marketing", material_type: "drive", thumbnail_url: "/brand/capao-sunset.png", external_url: "https://drive.google.com/", storage_path: null, target_plan_ids: [], published: true, created_at: "2026-09-29T12:00:00Z" },
  { id: "mat-2", title: "Roteiro de visita premium", description: "PDF para conduzir visitas de imóveis de alto padrão.", category: "Vendas", material_type: "pdf", thumbnail_url: "/brand/capao-sunset.png", external_url: "https://example.com/roteiro.pdf", storage_path: null, target_plan_ids: [], published: true, created_at: "2026-09-27T12:00:00Z" }
];

function readLocal<T>(key: string, fallback: T): T { try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) as T : fallback; } catch { return fallback; } }
function writeLocal(key: string, value: unknown) { localStorage.setItem(key, JSON.stringify(value)); }
function localId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function readDemoDeletionRequests(): SaasDeletionRequest[] { const item = readLocal<Partial<SaasDeletionRequest> | null>(deletionRequestKey, null); return item ? [{ id: "demo-deletion-request", user_id: item.user_id ?? "demo-user", email: item.email ?? "demo@agenda.local", status: item.status ?? "requested", requested_at: item.requested_at ?? new Date().toISOString(), resolved_at: item.resolved_at ?? null }] : []; }

export function useSaasAdmin() {
  const { user, isDemo } = useAuth();
  const queryClient = useQueryClient();
  const key = ["saas-admin", user?.id];
  const query = useQuery<AdminData>({ queryKey: key, enabled: Boolean(user), refetchOnMount: "always", queryFn: async () => {
    if (!hasSupabaseConfig) return { isAdmin: isDemo, plans: readLocal(plansKey, demoPlans), members: readLocal(membersKey, demoMembers), payments: readLocal(paymentsKey, demoPayments), materials: readLocal(materialsKey, demoMaterials), deletionRequests: readDemoDeletionRequests() };
    const db = requireSupabase() as any;
    const admin = await db.from("app_admins").select("user_id").eq("user_id", user!.id).maybeSingle();
    if (admin.error || !admin.data) return { isAdmin: false, plans: [], members: [], payments: [], materials: [], deletionRequests: [] };
    const [plans, profiles, subscriptions, payments, materials, deletionRequests] = await Promise.all([
      db.from("subscription_plans").select("*").order("monthly_price"),
      db.from("profiles").select("user_id,nome,email,cidade,created_at"),
      db.from("subscriptions").select("*").order("created_at", { ascending: false }),
      db.from("subscription_payments").select("*").order("due_date", { ascending: false }),
      db.from("admin_materials").select("*").order("created_at", { ascending: false }),
      db.from("account_deletion_requests").select("id,user_id,email,status,requested_at,resolved_at").order("requested_at", { ascending: false })
    ]);
    const profileByUser = new Map<string, { nome?: string; email?: string; cidade?: string }>((profiles.data ?? []).map((profile: any) => [profile.user_id, profile]));
    const mappedMembers = (subscriptions.data ?? []).map((subscription: any) => { const profile: any = profileByUser.get(subscription.user_id) ?? {}; return { id: subscription.id, user_id: subscription.user_id, name: profile.nome ?? "Assinante", email: profile.email ?? "E-mail não informado", city: profile.cidade ?? "Não informada", plan_id: subscription.plan_id, status: subscription.status, renewal: subscription.current_period_end?.slice(0, 10) ?? "", created_at: subscription.created_at }; });
    return { isAdmin: true, plans: plans.data ?? [], members: mappedMembers, payments: (payments.data ?? []).map((payment: any) => ({ ...payment, member_name: profileByUser.get(payment.user_id)?.nome ?? "Assinante" })), materials: materials.data ?? [], deletionRequests: deletionRequests.data ?? [] } as AdminData;
  }});
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const uploadMaterial = useMutation({ mutationFn: async (file: File) => {
    const materialType = validateMaterialFile(file);
    if (!hasSupabaseConfig) {
      if (file.size > 1_500_000) throw new Error("No modo demonstração, use arquivos de até 1,5 MB. Com o servidor conectado, o limite será maior.");
      return { externalUrl: await readMaterialAsDataUrl(file), storagePath: null, materialType };
    }
    const storagePath = `${user!.id}/${Date.now()}-${sanitizeMaterialFileName(file.name)}`;
    const storage = requireSupabase().storage.from("saas-materials");
    const uploaded = await storage.upload(storagePath, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (uploaded.error) throw uploaded.error;
    const signed = await storage.createSignedUrl(storagePath, 3600);
    if (signed.error) throw signed.error;
    return { externalUrl: signed.data.signedUrl, storagePath, materialType };
  }});
  const createMaterial = useMutation({ mutationFn: async (input: MaterialInput) => {
    if (!hasSupabaseConfig) { const material = { ...input, id: localId("material"), created_at: new Date().toISOString() }; writeLocal(materialsKey, [material, ...readLocal(materialsKey, demoMaterials)]); return material; }
    const { data, error } = await (requireSupabase() as any).from("admin_materials").insert({ ...input, created_by: user!.id, published_at: input.published ? new Date().toISOString() : null }).select("*").single();
    if (error) throw error; return data;
  }, onSuccess: invalidate });
  const toggleMaterial = useMutation({ mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
    if (!hasSupabaseConfig) { const next = readLocal(materialsKey, demoMaterials).map((item) => item.id === id ? { ...item, published } : item); writeLocal(materialsKey, next); return; }
    const { error } = await (requireSupabase() as any).from("admin_materials").update({ published, published_at: published ? new Date().toISOString() : null }).eq("id", id); if (error) throw error;
  }, onSuccess: invalidate });
  const updateMember = useMutation({ mutationFn: async ({ id, input }: { id: string; input: Partial<Pick<SaasMember, "status" | "plan_id">> }) => {
    if (!hasSupabaseConfig) { const next = readLocal(membersKey, demoMembers).map((item) => item.id === id ? { ...item, ...input } : item); writeLocal(membersKey, next); return; }
    const { error } = await (requireSupabase() as any).from("subscriptions").update(input).eq("id", id); if (error) throw error;
  }, onSuccess: invalidate });
  const updatePlan = useMutation({ mutationFn: async ({ id, input }: { id: string; input: Partial<SaasPlan> }) => {
    if (!hasSupabaseConfig) { const next = readLocal(plansKey, demoPlans).map((item) => item.id === id ? { ...item, ...input } : item); writeLocal(plansKey, next); return; }
    const { error } = await (requireSupabase() as any).from("subscription_plans").update(input).eq("id", id); if (error) throw error;
  }, onSuccess: invalidate });
  const updatePayment = useMutation({ mutationFn: async ({ id, status }: { id: string; status: SaasPayment["status"] }) => {
    if (!hasSupabaseConfig) { const next = readLocal(paymentsKey, demoPayments).map((item) => item.id === id ? { ...item, status } : item); writeLocal(paymentsKey, next); return; }
    const { error } = await (requireSupabase() as any).from("subscription_payments").update({ status, paid_at: status === "paid" ? new Date().toISOString() : null }).eq("id", id); if (error) throw error;
  }, onSuccess: invalidate });
  const updateDeletionRequest = useMutation({ mutationFn: async ({ id, status }: { id: string; status: SaasDeletionRequest["status"] }) => {
    if (!hasSupabaseConfig) { const current = readLocal<any>(deletionRequestKey, null); if (current) writeLocal(deletionRequestKey, { ...current, status, resolved_at: status === "completed" || status === "canceled" ? new Date().toISOString() : null }); return; }
    const { error } = await (requireSupabase() as any).from("account_deletion_requests").update({ status, resolved_at: status === "completed" || status === "canceled" ? new Date().toISOString() : null }).eq("id", id); if (error) throw error;
  }, onSuccess: invalidate });
  return { isAdmin: query.data?.isAdmin ?? false, isLoading: query.isLoading, plans: query.data?.plans ?? [], members: query.data?.members ?? [], payments: query.data?.payments ?? [], materials: query.data?.materials ?? [], deletionRequests: query.data?.deletionRequests ?? [], uploadMaterial, createMaterial, toggleMaterial, updateMember, updatePlan, updatePayment, updateDeletionRequest };
}

export function usePublishedMaterials() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["saas-materials", user?.id], enabled: Boolean(user), queryFn: async () => {
    if (!hasSupabaseConfig) return readLocal(materialsKey, demoMaterials).filter((item) => item.published);
    const { data, error } = await (requireSupabase() as any).from("admin_materials").select("*").eq("published", true).order("created_at", { ascending: false });
    if (error) throw error;
    const storage = requireSupabase().storage.from("saas-materials");
    return Promise.all((data as SaasMaterial[]).map(async (material) => {
      if (!material.storage_path) return material;
      const signed = await storage.createSignedUrl(material.storage_path, 3600);
      return { ...material, external_url: signed.error ? "" : signed.data.signedUrl };
    }));
  }});
}

export function useSubscriptionAccess() {
  const { user, isDemo } = useAuth();
  return useQuery({ queryKey: ["subscription-access", user?.id], enabled: Boolean(user), queryFn: async () => {
    if (!hasSupabaseConfig) return { status: isDemo ? "active" as const : null, currentPeriodEnd: null, trialEndsAt: null, planId: isDemo ? "plan-profissional" : null, planName: isDemo ? "Profissional" : null, planSlug: isDemo ? "profissional" : null, features: isDemo ? demoPlans[1].features : [], isAdmin: isDemo } satisfies SubscriptionAccess;
    const db = requireSupabase() as any;
    const admin = await db.from("app_admins").select("user_id").eq("user_id", user!.id).maybeSingle();
    if (admin.data) return { status: "active", currentPeriodEnd: null, trialEndsAt: null, planId: null, planName: "Administração", planSlug: "equipe", features: demoPlans[2].features, isAdmin: true } satisfies SubscriptionAccess;
    const { data, error } = await db.from("subscriptions").select("status,current_period_end,trial_ends_at,plan_id").eq("user_id", user!.id).maybeSingle();
    if (error) throw error;
    const plan = data?.plan_id ? await db.from("subscription_plans").select("name,slug,features").eq("id", data.plan_id).maybeSingle() : { data: null };
    return { status: data?.status as SaasMember["status"] | null, currentPeriodEnd: data?.current_period_end as string | null, trialEndsAt: data?.trial_ends_at as string | null, planId: data?.plan_id as string | null, planName: plan.data?.name as string | null, planSlug: plan.data?.slug as string | null, features: (plan.data?.features ?? []) as string[], isAdmin: false } satisfies SubscriptionAccess;
  }});
}
