import { requireSupabase } from "@/lib/supabase";
import type { Client, ClientActivity, ClientActivityType, ClientStatus } from "@/types/database";

export type ClientInput = Omit<Partial<Client>, "id" | "user_id" | "created_at" | "updated_at"> & { name: string };

export async function listClients(userId: string) {
  const { data, error } = await (requireSupabase() as any).from("clients").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Client[];
}

export async function createClient(userId: string, input: ClientInput) {
  const client = { ...input, user_id: userId };
  const { data, error } = await (requireSupabase() as any).from("clients").insert(client).select("*").single();
  if (error) throw error;
  await (requireSupabase() as any).from("client_activities").insert({ user_id: userId, client_id: data.id, type: "cadastro", title: "Cliente cadastrado", details: input.source ? `Origem: ${input.source}` : null });
  return data as Client;
}

export async function updateClient(userId: string, id: string, input: Partial<Client>, previousStatus?: ClientStatus) {
  const { data, error } = await (requireSupabase() as any).from("clients").update(input).eq("id", id).eq("user_id", userId).select("*").single();
  if (error) throw error;
  if (input.status && input.status !== previousStatus) {
    await (requireSupabase() as any).from("client_activities").insert({ user_id: userId, client_id: id, type: input.status === "venda realizada" ? "venda" : "mudança de etapa", title: `Etapa alterada para ${input.status}`, details: input.sale_date ? `Venda em ${input.sale_date}` : null });
  }
  return data as Client;
}

export async function listClientActivities(userId: string, clientId: string) {
  const { data, error } = await (requireSupabase() as any)
    .from("client_activities")
    .select("*")
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return data as ClientActivity[];
}

export async function createClientActivity(userId: string, input: { client_id: string; type: ClientActivityType; title: string; details?: string | null }) {
  const { data, error } = await (requireSupabase() as any)
    .from("client_activities")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as ClientActivity;
}
