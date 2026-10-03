import type { CalendarEvent, Client, Commission } from "@/types/database";

export function normalizeContact(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

export function clientIdentity(client: Pick<Client, "id" | "name" | "phone" | "whatsapp" | "email" | "city">) {
  const phone = normalizeContact(client.whatsapp || client.phone);
  if (phone.length >= 8) return `phone:${phone}`;
  const email = client.email?.trim().toLocaleLowerCase("pt-BR");
  if (email) return `email:${email}`;
  const name = client.name.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
  const city = client.city?.trim().toLocaleLowerCase("pt-BR") ?? "";
  return name ? `name:${name}|${city}` : `id:${client.id}`;
}

export function deduplicateClients<T extends Pick<Client, "id" | "name" | "phone" | "whatsapp" | "email" | "city" | "updated_at">>(clients: T[]) {
  const byIdentity = new Map<string, T>();
  for (const client of clients) {
    const key = clientIdentity(client);
    const current = byIdentity.get(key);
    if (!current || new Date(client.updated_at).getTime() > new Date(current.updated_at).getTime()) byIdentity.set(key, client);
  }
  return [...byIdentity.values()];
}

export function buildCommercialMetrics(input: { clients: Client[]; events: CalendarEvent[]; commissions: Commission[] }) {
  const clients = deduplicateClients(input.clients);
  const receivedOrConfirmed = input.commissions.filter((commission) => ["confirmada", "parcialmente recebida", "recebida"].includes(commission.status));
  const leadCount = clients.filter((client) => client.status === "lead").length;
  const contactedLeads = clients.filter((client) => ["em contato", "qualificado"].includes(client.status)).length;
  const conversionBase = clients.filter((client) => !["pós-venda", "perdido"].includes(client.status)).length;
  const profiles = clients.map((client) => client.property_profile).filter((value): value is string => Boolean(value));
  const profileCounts = profiles.reduce<Record<string, number>>((acc, profile) => ({ ...acc, [profile]: (acc[profile] ?? 0) + 1 }), {});
  const propertyProfile = Object.entries(profileCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    uniqueClients: clients,
    duplicateCount: Math.max(0, input.clients.length - clients.length),
    visitedProperties: input.events.filter((event) => event.type === "visita" && event.status === "concluído").length,
    scheduledVisits: input.events.filter((event) => event.type === "visita" && event.status === "agendado").length,
    convertedSales: receivedOrConfirmed.length,
    leadsReceived: leadCount,
    contactedLeads,
    conversionRate: conversionBase ? Math.min(100, Math.round((receivedOrConfirmed.length / conversionBase) * 100)) : null,
    propertyProfile: propertyProfile ?? "Dados insuficientes",
    clientPortfolio: clients.length
  };
}
