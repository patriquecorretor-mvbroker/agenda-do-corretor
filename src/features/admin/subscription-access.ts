import type { AppView } from "@/types/ui";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "suspended" | "canceled";

export type SubscriptionAccess = {
  status: SubscriptionStatus | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  planId: string | null;
  planName: string | null;
  planSlug: string | null;
  features: string[];
  isAdmin: boolean;
};

const featureByView: Partial<Record<AppView, string>> = {
  agenda: "Agenda",
  clients: "Clientes",
  focus: "Foco",
  library: "Materiais",
  files: "Meus Arquivos",
  finance: "Financeiro",
  goals: "Metas",
  buildings: "Edifícios",
  condominiums: "Condomínios",
  news: "Mercado",
  "city-media": "Mídia da Cidade"
};

const alwaysAvailable = new Set<AppView>(["day", "profile", "settings", "billing"]);

export function hasSubscriptionAccess(access?: SubscriptionAccess | null, now = new Date()) {
  if (!access) return false;
  if (access.isAdmin) return true;
  if (access.status === "active") return true;
  if (access.status !== "trialing") return false;
  return !access.trialEndsAt || new Date(access.trialEndsAt).getTime() >= now.getTime();
}

export function canAccessView(view: AppView, access?: SubscriptionAccess | null) {
  if (!hasSubscriptionAccess(access)) return false;
  if (access?.isAdmin) return true;
  if (view === "admin") return Boolean(access?.isAdmin);
  if (alwaysAvailable.has(view)) return true;
  const requiredFeature = featureByView[view];
  return !requiredFeature || Boolean(access?.features.includes(requiredFeature));
}
