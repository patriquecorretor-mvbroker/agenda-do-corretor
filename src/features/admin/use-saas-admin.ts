import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-context";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import type { SubscriptionAccess } from "@/features/admin/subscription-access";
import { readMaterialAsDataUrl, sanitizeMaterialFileName, validateMaterialFile } from "./material-upload";

export type SaasPlan = { id: string; name: string; slug: string; description: string; monthly_price: number; annual_price: number; features: string[]; active: boolean };
export type SaasMember = { id: string; user_id: string; name: string; email: string; city: string; phone?: string | null; whatsapp?: string | null; creci?: string | null; company?: string | null; provider?: string | null; plan_id: string; status: "trialing" | "active" | "past_due" | "suspended" | "canceled"; renewal: string; created_at: string };
export type SaasPayment = { id: string; user_id: string; member_name: string; amount: number; due_date: string; status: "pending" | "paid" | "overdue" | "refunded" | "canceled"; payment_method: string };
export type SaasBillingRequest = { id: string; user_id: string; member_name: string; plan_id: string | null; action: "subscribe" | "change_plan" | "cancel" | "reactivate"; billing_cycle: "monthly" | "annual"; status: "pending" | "processing" | "completed" | "failed" | "canceled"; created_at: string };
export type SaasDeletionRequest = { id: string; user_id: string; email: string; status: "requested" | "in_review" | "completed" | "canceled"; requested_at: string; resolved_at: string | null };
export type SaasMaterial = { id: string; title: string; description: string; category: string; material_type: "image" | "video" | "pdf" | "drive" | "link"; thumbnail_url: string; external_url: string; storage_path: string | null; target_plan_ids: string[]; published: boolean; created_at: string };
export type SaasGiveawayDraw = { id: string; winner_user_id: string | null; winner_name: string; winner_email: string | null; winner_city: string | null; winner_plan_name: string | null; prize_title: string; prize_description: string | null; participant_count: number; participant_user_ids: string[]; created_by: string; drawn_at: string };
export type AdminAuditLog = { id: string; actor_user_id: string | null; action: string; entity_type: string; entity_id: string | null; summary: string; metadata: Record<string, unknown>; created_at: string };
export type GiveawayInput = Omit<SaasGiveawayDraw, "id" | "created_by" | "drawn_at">;
export type MaterialInput = Omit<SaasMaterial, "id" | "created_at">;
type AdminData = { isAdmin: boolean; plans: SaasPlan[]; members: SaasMember[]; payments: SaasPayment[]; billingRequests: SaasBillingRequest[]; materials: SaasMaterial[]; deletionRequests: SaasDeletionRequest[]; giveaways: SaasGiveawayDraw[]; auditLogs: AdminAuditLog[] };

const materialsKey = "agenda-saas-materials";
const membersKey = "agenda-saas-members";
const paymentsKey = "agenda-saas-payments";
const plansKey = "agenda-saas-plans";
const deletionRequestKey = "agenda-demo-deletion-request";
const billingRequestsKey = "agenda-demo-billing-requests";
const giveawaysKey = "agenda-saas-giveaways";
const auditLogsKey = "agenda-saas-audit-logs";

const demoPlans: SaasPlan[] = [
  { id: "plan-essencial", name: "Essencial", slug: "essencial", description: "Agenda, clientes e foco comercial.", monthly_price: 49.9, annual_price: 499, active: true, features: ["Agenda", "Clientes", "Foco", "Materiais", "Meus Arquivos"] },
  { id: "plan-profissional", name: "Profissional", slug: "profissional", description: "Gestão comercial e financeira completa.", monthly_price: 89.9, annual_price: 899, active: true, features: ["Agenda", "Clientes", "Foco", "Materiais", "Meus Arquivos", "Financeiro", "Metas", "Edifícios", "Condomínios", "Mercado", "Mídia da Cidade"] }
];
const demoMembers: SaasMember[] = [];
const demoPayments: SaasPayment[] = [];
const demoMaterials: SaasMaterial[] = [];

function readLocal<T>(key: string, fallback: T): T { try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) as T : fallback; } catch { return fallback; } }
function writeLocal(key: string, value: unknown) { localStorage.setItem(key, JSON.stringify(value)); }
function localId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function appendLocalAudit(summary: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  const log: AdminAuditLog = { id: localId("audit"), actor_user_id: "demo-user", action: "update", entity_type: entityType, entity_id: entityId ?? null, summary, metadata, created_at: new Date().toISOString() };
  writeLocal(auditLogsKey, [log, ...readLocal<AdminAuditLog[]>(auditLogsKey, [])].slice(0, 100));
}
function readDemoDeletionRequests(): SaasDeletionRequest[] { const item = readLocal<Partial<SaasDeletionRequest> | null>(deletionRequestKey, null); return item ? [{ id: "demo-deletion-request", user_id: item.user_id ?? "demo-user", email: item.email ?? "demo@agenda.local", status: item.status ?? "requested", requested_at: item.requested_at ?? new Date().toISOString(), resolved_at: item.resolved_at ?? null }] : []; }

export function useSaasAdmin() {
  const { user, isDemo } = useAuth();
  const queryClient = useQueryClient();
  const key = ["saas-admin", user?.id];
  const query = useQuery<AdminData>({ queryKey: key, enabled: Boolean(user), refetchOnMount: "always", queryFn: async () => {
    if (!hasSupabaseConfig) return { isAdmin: false, plans: readLocal(plansKey, demoPlans), members: readLocal(membersKey, demoMembers), payments: readLocal(paymentsKey, demoPayments), billingRequests: readLocal<SaasBillingRequest[]>(billingRequestsKey, []).map((item) => ({ ...item, member_name: "Assinante local", user_id: "demo-user" })), materials: readLocal(materialsKey, demoMaterials), deletionRequests: readDemoDeletionRequests(), giveaways: readLocal(giveawaysKey, []), auditLogs: readLocal(auditLogsKey, []) };
    const db = requireSupabase() as any;
    const admin = await db.from("app_admins").select("user_id").eq("user_id", user!.id).maybeSingle();
    if (admin.error || !admin.data) return { isAdmin: false, plans: [], members: [], payments: [], billingRequests: [], materials: [], deletionRequests: [], giveaways: [], auditLogs: [] };
    const [plans, profiles, subscriptions, payments, billingRequests, materials, deletionRequests, giveaways, auditLogs] = await Promise.all([
      db.from("subscription_plans").select("*").order("monthly_price"),
      db.from("profiles").select("user_id,nome,email,cidade,telefone,whatsapp,creci,empresa,created_at"),
      db.from("subscriptions").select("*").order("created_at", { ascending: false }),
      db.from("subscription_payments").select("*").order("due_date", { ascending: false }),
      db.from("billing_requests").select("*").order("created_at", { ascending: false }),
      db.from("admin_materials").select("*").order("created_at", { ascending: false }),
      db.from("account_deletion_requests").select("id,user_id,email,status,requested_at,resolved_at").order("requested_at", { ascending: false }),
      db.from("admin_giveaway_draws").select("*").order("drawn_at", { ascending: false }).limit(30),
      db.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(100)
    ]);
    const profileByUser = new Map<string, { nome?: string; email?: string; cidade?: string; telefone?: string; whatsapp?: string; creci?: string; empresa?: string }>((profiles.data ?? []).map((profile: any) => [profile.user_id, profile]));
    const mappedMembers = (subscriptions.data ?? []).map((subscription: any) => { const profile: any = profileByUser.get(subscription.user_id) ?? {}; return { id: subscription.id, user_id: subscription.user_id, name: profile.nome ?? "Assinante", email: profile.email ?? "E-mail não informado", city: profile.cidade ?? "Não informada", phone: profile.telefone ?? null, whatsapp: profile.whatsapp ?? null, creci: profile.creci ?? null, company: profile.empresa ?? null, provider: subscription.provider ?? null, plan_id: subscription.plan_id, status: subscription.status, renewal: subscription.current_period_end?.slice(0, 10) ?? "", created_at: subscription.created_at }; });
    return { isAdmin: true, plans: plans.data ?? [], members: mappedMembers, payments: (payments.data ?? []).map((payment: any) => ({ ...payment, member_name: profileByUser.get(payment.user_id)?.nome ?? "Assinante" })), billingRequests: (billingRequests.data ?? []).map((request: any) => ({ ...request, member_name: profileByUser.get(request.user_id)?.nome ?? "Assinante" })), materials: materials.data ?? [], deletionRequests: deletionRequests.data ?? [], giveaways: giveaways.data ?? [], auditLogs: auditLogs.data ?? [] } as AdminData;
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
    if (!hasSupabaseConfig) { const material = { ...input, id: localId("material"), created_at: new Date().toISOString() }; writeLocal(materialsKey, [material, ...readLocal(materialsKey, demoMaterials)]); appendLocalAudit("Material administrativo criado", "admin_materials", material.id, { title: material.title }); return material; }
    const { data, error } = await (requireSupabase() as any).from("admin_materials").insert({ ...input, created_by: user!.id, published_at: input.published ? new Date().toISOString() : null }).select("*").single();
    if (error) throw error; return data;
  }, onSuccess: invalidate });
  const toggleMaterial = useMutation({ mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
    if (!hasSupabaseConfig) { const next = readLocal(materialsKey, demoMaterials).map((item) => item.id === id ? { ...item, published } : item); writeLocal(materialsKey, next); appendLocalAudit("Publicação de material atualizada", "admin_materials", id, { published }); return; }
    const { error } = await (requireSupabase() as any).from("admin_materials").update({ published, published_at: published ? new Date().toISOString() : null }).eq("id", id); if (error) throw error;
  }, onSuccess: invalidate });
  const updateMember = useMutation({ mutationFn: async ({ id, input }: { id: string; input: Partial<Pick<SaasMember, "status" | "plan_id">> }) => {
    if (!hasSupabaseConfig) { const next = readLocal(membersKey, demoMembers).map((item) => item.id === id ? { ...item, ...input } : item); writeLocal(membersKey, next); appendLocalAudit("Acesso ou plano do assinante atualizado", "subscriptions", id, input); return; }
    const { error } = await (requireSupabase() as any).from("subscriptions").update(input).eq("id", id); if (error) throw error;
  }, onSuccess: invalidate });
  const updatePlan = useMutation({ mutationFn: async ({ id, input }: { id: string; input: Partial<SaasPlan> }) => {
    if (!hasSupabaseConfig) { const next = readLocal(plansKey, demoPlans).map((item) => item.id === id ? { ...item, ...input } : item); writeLocal(plansKey, next); appendLocalAudit("Plano comercial atualizado", "subscription_plans", id, input); return; }
    const { error } = await (requireSupabase() as any).from("subscription_plans").update(input).eq("id", id); if (error) throw error;
  }, onSuccess: invalidate });
  const updatePayment = useMutation({ mutationFn: async ({ id, status }: { id: string; status: SaasPayment["status"] }) => {
    if (!hasSupabaseConfig) { const next = readLocal(paymentsKey, demoPayments).map((item) => item.id === id ? { ...item, status } : item); writeLocal(paymentsKey, next); appendLocalAudit("Status de cobrança atualizado", "subscription_payments", id, { status }); return; }
    const { error } = await (requireSupabase() as any).from("subscription_payments").update({ status, paid_at: status === "paid" ? new Date().toISOString() : null }).eq("id", id); if (error) throw error;
  }, onSuccess: invalidate });
  const updateBillingRequest = useMutation({ mutationFn: async ({ id, status }: { id: string; status: SaasBillingRequest["status"] }) => {
    if (!hasSupabaseConfig) { const next = readLocal<SaasBillingRequest[]>(billingRequestsKey, []).map((item) => item.id === id ? { ...item, status } : item); writeLocal(billingRequestsKey, next); appendLocalAudit("Solicitação de cobrança atualizada", "billing_requests", id, { status }); return; }
    const { error } = await (requireSupabase() as any).from("billing_requests").update({ status }).eq("id", id); if (error) throw error;
  }, onSuccess: invalidate });
  const updateDeletionRequest = useMutation({ mutationFn: async ({ id, status }: { id: string; status: SaasDeletionRequest["status"] }) => {
    if (!hasSupabaseConfig) { const current = readLocal<any>(deletionRequestKey, null); if (current) writeLocal(deletionRequestKey, { ...current, status, resolved_at: status === "completed" || status === "canceled" ? new Date().toISOString() : null }); appendLocalAudit("Solicitação de privacidade atualizada", "account_deletion_requests", id, { status }); return; }
    const { error } = await (requireSupabase() as any).from("account_deletion_requests").update({ status, resolved_at: status === "completed" || status === "canceled" ? new Date().toISOString() : null }).eq("id", id); if (error) throw error;
  }, onSuccess: invalidate });
  const processDeletionRequest = useMutation({ mutationFn: async (id: string) => {
    if (!hasSupabaseConfig) { const current = readLocal<any>(deletionRequestKey, null); if (current) writeLocal(deletionRequestKey, { ...current, status: "completed", resolved_at: new Date().toISOString() }); appendLocalAudit("Conta e dados vinculados excluídos", "account_deletion_requests", id, { status: "completed" }); return; }
    const { data, error } = await requireSupabase().functions.invoke("process-account-deletion", { body: { requestId: id } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  }, onSuccess: invalidate });
  const createGiveaway = useMutation({ mutationFn: async (input: GiveawayInput) => {
    if (!hasSupabaseConfig) {
      const draw = { ...input, id: localId("draw"), created_by: user!.id, drawn_at: new Date().toISOString() };
      writeLocal(giveawaysKey, [draw, ...readLocal<SaasGiveawayDraw[]>(giveawaysKey, [])]);
      appendLocalAudit("Sorteio de assinantes realizado", "admin_giveaway_draws", draw.id, { winner: draw.winner_name, participants: draw.participant_count });
      return draw;
    }
    const { data, error } = await (requireSupabase() as any).from("admin_giveaway_draws").insert({ ...input, created_by: user!.id }).select("*").single();
    if (error) throw error;
    return data as SaasGiveawayDraw;
  }, onSuccess: invalidate });
  return { isAdmin: query.data?.isAdmin ?? false, isLoading: query.isLoading, plans: query.data?.plans ?? [], members: query.data?.members ?? [], payments: query.data?.payments ?? [], billingRequests: query.data?.billingRequests ?? [], materials: query.data?.materials ?? [], deletionRequests: query.data?.deletionRequests ?? [], giveaways: query.data?.giveaways ?? [], auditLogs: query.data?.auditLogs ?? [], uploadMaterial, createMaterial, toggleMaterial, updateMember, updatePlan, updatePayment, updateBillingRequest, updateDeletionRequest, processDeletionRequest, createGiveaway };
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
    if (!hasSupabaseConfig) return { status: isDemo ? "active" as const : null, currentPeriodEnd: null, trialEndsAt: null, planId: isDemo ? "plan-profissional" : null, planName: isDemo ? "Profissional" : null, planSlug: isDemo ? "profissional" : null, features: isDemo ? demoPlans[1].features : [], isAdmin: false } satisfies SubscriptionAccess;
    const db = requireSupabase() as any;
    const admin = await db.from("app_admins").select("user_id").eq("user_id", user!.id).maybeSingle();
    if (admin.data) return { status: "active", currentPeriodEnd: null, trialEndsAt: null, planId: null, planName: "Administração", planSlug: "profissional", features: demoPlans[1].features, isAdmin: true } satisfies SubscriptionAccess;
    const { data, error } = await db.from("subscriptions").select("status,current_period_end,trial_ends_at,plan_id").eq("user_id", user!.id).maybeSingle();
    if (error) throw error;
    const plan = data?.plan_id ? await db.from("subscription_plans").select("name,slug,features").eq("id", data.plan_id).maybeSingle() : { data: null };
    return { status: data?.status as SaasMember["status"] | null, currentPeriodEnd: data?.current_period_end as string | null, trialEndsAt: data?.trial_ends_at as string | null, planId: data?.plan_id as string | null, planName: plan.data?.name as string | null, planSlug: plan.data?.slug as string | null, features: (plan.data?.features ?? []) as string[], isAdmin: false } satisfies SubscriptionAccess;
  }});
}
