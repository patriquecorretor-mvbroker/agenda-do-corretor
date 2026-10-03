import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.46.1";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    authorizeCron(request);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, getSecretKey());
    const { data: preferences, error } = await admin.from("notification_preferences").select("*").eq("enabled", true);
    if (error) throw error;
    let sent = 0;
    for (const preference of preferences ?? []) sent += await processUser(admin, preference);
    return Response.json({ processedUsers: preferences?.length ?? 0, sent }, { headers: cors });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao enviar notificações" }, { status: 500, headers: cors });
  }
});

function authorizeCron(request: Request) {
  const expected = Deno.env.get("NOTIFICATIONS_CRON_SECRET");
  if (!expected || request.headers.get("x-cron-secret") !== expected) throw new Error("Não autorizado");
}

function getSecretKey() {
  const current = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (current) return JSON.parse(current).default as string;
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacy) throw new Error("Chave administrativa não configurada");
  return legacy;
}

async function processUser(admin: any, preference: any) {
  const now = new Date();
  const local = localParts(now, preference.timezone || "America/Sao_Paulo");
  if (inQuietHours(local.time, String(preference.quiet_start), String(preference.quiet_end))) return 0;
  const candidates: Array<{ kind: string; title: string; body: string; view: string; key: string }> = [];
  const userId = preference.user_id;

  if (preference.appointments) {
    const { data } = await admin.from("calendar_events").select("id,title,start_time,location").eq("user_id", userId).eq("date", local.date).eq("status", "agendado");
    for (const item of data ?? []) {
      const until = minutes(item.start_time) - minutes(local.time);
      if (until >= 0 && until <= preference.reminder_minutes) candidates.push({ kind: "appointment", title: "Compromisso se aproximando", body: `${item.title} às ${String(item.start_time).slice(0,5)}${item.location ? ` em ${item.location}` : ""}.`, view: "agenda", key: `event:${item.id}:${local.date}:${preference.reminder_minutes}` });
    }
  }
  if (preference.tasks) {
    const { data } = await admin.from("tasks").select("id,title,due_time").eq("user_id", userId).eq("due_date", local.date).eq("status", "pendente");
    for (const item of data ?? []) if (!item.due_time || Math.abs(minutes(item.due_time) - minutes(local.time)) <= preference.reminder_minutes) candidates.push({ kind: "task", title: "Tarefa para hoje", body: item.title, view: "agenda", key: `task:${item.id}:${local.date}` });
  }
  if (preference.follow_ups) {
    const { data } = await admin.from("clients").select("id,name").eq("user_id", userId).eq("next_follow_up", local.date);
    for (const item of data ?? []) candidates.push({ kind: "follow_up", title: "Follow-up de cliente", body: `Hoje é dia de retomar o contato com ${item.name}.`, view: "clients", key: `followup:${item.id}:${local.date}` });
  }
  if (preference.finance) {
    const { data } = await admin.from("financial_transactions").select("id,type,category,amount").eq("user_id", userId).eq("due_date", local.date).in("status", ["pendente", "atrasado"]);
    for (const item of data ?? []) candidates.push({ kind: "finance", title: item.type === "income" ? "Valor a receber hoje" : "Conta a pagar hoje", body: `${money(item.amount)} em ${item.category}.`, view: "finance", key: `finance:${item.id}:${local.date}` });
  }
  if (preference.commissions) {
    const { data } = await admin.from("commission_installments").select("id,expected_amount,received_amount").eq("user_id", userId).eq("due_date", local.date).in("status", ["prevista", "confirmada", "parcialmente recebida", "atrasada"]);
    for (const item of data ?? []) candidates.push({ kind: "commission", title: "Comissão prevista para hoje", body: `Saldo previsto de ${money(Number(item.expected_amount) - Number(item.received_amount))}.`, view: "finance", key: `commission:${item.id}:${local.date}` });
  }

  let sent = 0;
  for (const candidate of candidates) {
    const { data, error } = await admin.from("notifications").insert({ user_id: userId, kind: candidate.kind, title: candidate.title, body: candidate.body, target_view: candidate.view, scheduled_for: now.toISOString(), dedupe_key: candidate.key }).select("id").maybeSingle();
    if (error?.code === "23505") continue;
    if (error) throw error;
    try {
      await sendOneSignal(userId, candidate);
      await admin.from("notifications").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", data.id);
      sent++;
    } catch (sendError) {
      await admin.from("notifications").update({ status: "failed", error_message: sendError instanceof Error ? sendError.message.slice(0, 500) : "Falha no envio" }).eq("id", data.id);
    }
  }
  return sent;
}

async function sendOneSignal(userId: string, notification: { title: string; body: string; view: string }) {
  const appId = Deno.env.get("ONESIGNAL_APP_ID");
  const apiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
  if (!appId || !apiKey) throw new Error("OneSignal não configurado");
  const baseUrl = Deno.env.get("APP_PUBLIC_URL") ?? "https://agenda-do-corretor.patrique-corretor.chatgpt.site/";
  const response = await fetch("https://api.onesignal.com/notifications", { method: "POST", headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ app_id: appId, target_channel: "push", include_aliases: { external_id: [userId] }, headings: { pt: notification.title, en: notification.title }, contents: { pt: notification.body, en: notification.body }, url: `${baseUrl}?view=${encodeURIComponent(notification.view)}` }) });
  if (!response.ok) throw new Error(`OneSignal respondeu ${response.status}: ${(await response.text()).slice(0, 240)}`);
}

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${value("year")}-${value("month")}-${value("day")}`, time: `${value("hour")}:${value("minute")}` };
}
function minutes(value: string) { const [hour, minute] = value.slice(0,5).split(":").map(Number); return hour * 60 + minute; }
function inQuietHours(current: string, start: string, end: string) { const now = minutes(current); const from = minutes(start); const to = minutes(end); return from <= to ? now >= from && now < to : now >= from || now < to; }
function money(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value); }
