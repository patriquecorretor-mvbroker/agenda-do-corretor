import { useEffect, useState } from "react";
import OneSignal from "react-onesignal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-context";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";

export type NotificationPreferences = { enabled: boolean; appointments: boolean; tasks: boolean; follow_ups: boolean; finance: boolean; commissions: boolean; market_news: boolean; reminder_minutes: number; quiet_start: string; quiet_end: string; timezone: string };
export type AppNotification = { id: string; kind: "appointment" | "task" | "follow_up" | "finance" | "commission" | "market" | "system"; title: string; body: string; target_view: string | null; created_at: string; read_at: string | null; status: string };

const defaults: NotificationPreferences = { enabled: false, appointments: true, tasks: true, follow_ups: true, finance: true, commissions: true, market_news: false, reminder_minutes: 30, quiet_start: "21:00", quiet_end: "08:00", timezone: "America/Sao_Paulo" };
const preferencesKey = "agenda-notification-preferences";
const readKey = "agenda-demo-read-notifications";
const demoNotifications: AppNotification[] = [
  { id: "demo-notification-1", kind: "appointment", title: "Visita se aproximando", body: "Visita agendada em 30 minutos. Confira endereço e cliente.", target_view: "agenda", created_at: new Date().toISOString(), read_at: null, status: "sent" },
  { id: "demo-notification-2", kind: "finance", title: "Recebimento previsto", body: "Há uma comissão prevista para hoje no seu financeiro.", target_view: "finance", created_at: new Date(Date.now() - 3600000).toISOString(), read_at: null, status: "sent" }
];
let oneSignalInitialized = false;
let oneSignalInitPromise: Promise<void> | null = null;

function readPreferences() { try { return { ...defaults, ...JSON.parse(localStorage.getItem(preferencesKey) ?? "{}") } as NotificationPreferences; } catch { return defaults; } }
function demoNotificationRows() { let read: string[] = []; try { read = JSON.parse(localStorage.getItem(readKey) ?? "[]") as string[]; } catch { /* mantém não lidas */ } return demoNotifications.map((item) => ({ ...item, read_at: read.includes(item.id) ? new Date().toISOString() : null })); }

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["notifications", user?.id];
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined;
  const [pushState, setPushState] = useState<"unavailable" | "ready" | "enabled" | "blocked">(() => !appId ? "unavailable" : Notification.permission === "denied" ? "blocked" : "ready");
  const query = useQuery({ queryKey: key, enabled: Boolean(user), queryFn: async () => {
    if (!hasSupabaseConfig) return { preferences: readPreferences(), notifications: demoNotificationRows() };
    const db = requireSupabase() as any;
    const [preferences, notifications] = await Promise.all([
      db.from("notification_preferences").select("enabled,appointments,tasks,follow_ups,finance,commissions,market_news,reminder_minutes,quiet_start,quiet_end,timezone").eq("user_id", user!.id).maybeSingle(),
      db.from("notifications").select("id,kind,title,body,target_view,created_at,read_at,status").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(40)
    ]);
    if (preferences.error) throw preferences.error;
    if (notifications.error) throw notifications.error;
    return { preferences: { ...defaults, ...(preferences.data ?? {}) } as NotificationPreferences, notifications: notifications.data as AppNotification[] };
  }});

  useEffect(() => {
    if (!appId || !user || oneSignalInitialized) return;
    ensureOneSignal(appId)
      .then(async () => { oneSignalInitialized = true; await OneSignal.login(user.id); setPushState(OneSignal.User.PushSubscription.optedIn ? "enabled" : "ready"); })
      .catch(() => setPushState(Notification.permission === "denied" ? "blocked" : "ready"));
  }, [appId, user]);

  const savePreferences = useMutation({ mutationFn: async (input: Partial<NotificationPreferences>) => {
    const next = { ...(query.data?.preferences ?? defaults), ...input };
    if (!hasSupabaseConfig) { localStorage.setItem(preferencesKey, JSON.stringify(next)); return next; }
    const { error } = await (requireSupabase() as any).from("notification_preferences").upsert({ user_id: user!.id, ...next }, { onConflict: "user_id" });
    if (error) throw error;
    return next;
  }, onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) });

  const enablePush = useMutation({ mutationFn: async () => {
    if (!appId) throw new Error("A chave pública do OneSignal ainda não foi configurada.");
    if (!oneSignalInitialized) {
      await ensureOneSignal(appId);
    }
    await OneSignal.login(user!.id);
    const allowed = await OneSignal.Notifications.requestPermission();
    if (!allowed) { setPushState(Notification.permission === "denied" ? "blocked" : "ready"); throw new Error("A permissão de notificações não foi concedida."); }
    await OneSignal.User.PushSubscription.optIn();
    setPushState("enabled");
    await savePreferences.mutateAsync({ enabled: true });
  }});

  const markRead = useMutation({ mutationFn: async (id: string) => {
    if (!hasSupabaseConfig) { const read = demoNotificationRows().filter((item) => item.read_at).map((item) => item.id); localStorage.setItem(readKey, JSON.stringify(Array.from(new Set([...read, id])))); return; }
    const { error } = await (requireSupabase() as any).from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", user!.id);
    if (error) throw error;
  }, onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) });

  const markAllRead = useMutation({ mutationFn: async () => {
    if (!hasSupabaseConfig) { localStorage.setItem(readKey, JSON.stringify(demoNotifications.map((item) => item.id))); return; }
    const { error } = await (requireSupabase() as any).from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user!.id).is("read_at", null);
    if (error) throw error;
  }, onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) });

  const notifications = query.data?.notifications ?? [];
  return { ...query, preferences: query.data?.preferences ?? defaults, notifications, unreadCount: notifications.filter((item) => !item.read_at).length, pushState, savePreferences, enablePush, markRead, markAllRead, configured: Boolean(appId) };
}

async function ensureOneSignal(appId: string) {
  if (!oneSignalInitPromise) oneSignalInitPromise = OneSignal.init({ appId, allowLocalhostAsSecureOrigin: true, serviceWorkerPath: "onesignal/OneSignalSDKWorker.js", serviceWorkerParam: { scope: "/onesignal/" } });
  await oneSignalInitPromise;
  oneSignalInitialized = true;
}
