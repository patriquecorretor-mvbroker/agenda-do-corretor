import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";

const userTables = [
  "profiles", "calendar_events", "tasks", "daily_summaries", "clients", "client_activities", "client_map_marks",
  "commissions", "commission_installments", "financial_transactions", "financial_categories", "monthly_budgets", "financial_attachments",
  "building_overrides", "condominiums", "condominium_assets", "city_media", "broker_files", "market_news_user_state", "market_news_settings",
  "subscriptions", "subscription_payments", "billing_requests", "notification_preferences", "notifications", "legal_consents", "account_deletion_requests"
];

export function collectLocalAccountData(storage: Storage) {
  const data: Record<string, unknown> = {};
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !isAccountStorageKey(key)) continue;
    const value = storage.getItem(key);
    try { data[key] = value === null ? null : JSON.parse(value); }
    catch { data[key] = value; }
  }
  return data;
}

export async function exportAccountData(userId: string) {
  const exportedAt = new Date().toISOString();
  if (!hasSupabaseConfig) return { exportedAt, mode: "demo", data: collectLocalAccountData(localStorage) };
  const db = requireSupabase() as any;
  const entries = await Promise.all(userTables.map(async (table) => {
    const { data, error } = await db.from(table).select("*").eq("user_id", userId);
    return [table, error ? { unavailable: true } : data ?? []] as const;
  }));
  return { exportedAt, mode: "supabase", userId, data: Object.fromEntries(entries) };
}

export function downloadAccountExport(payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `agenda-do-corretor-dados-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function requestAccountDeletion(userId: string, email?: string | null) {
  if (!hasSupabaseConfig) {
    localStorage.setItem("agenda-demo-deletion-request", JSON.stringify({ user_id: userId, email: email ?? null, requested_at: new Date().toISOString(), status: "requested" }));
    return;
  }
  const { error } = await (requireSupabase() as any).from("account_deletion_requests").upsert({ user_id: userId, email: email ?? null, status: "requested", requested_at: new Date().toISOString(), resolved_at: null }, { onConflict: "user_id" });
  if (error) throw error;
}

function isAccountStorageKey(key: string) {
  return key.startsWith("agenda-") || key.startsWith("mv-broker-") || ["theme", "palette", "custom-color"].includes(key);
}
