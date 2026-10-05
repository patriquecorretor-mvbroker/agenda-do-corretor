import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-context";
import { hasSupabaseConfig } from "@/lib/supabase";
import type { Client } from "@/types/database";
import { createClient, listClients, updateClient, type ClientInput } from "./client-service";
import { appendLocalClientActivity } from "./use-client-activities";

const demoKey = "mv-broker-crm-clients";

const demoClients: Client[] = [];

function readLocal(): Client[] {
  try { const saved = localStorage.getItem(demoKey); return saved === null ? demoClients : JSON.parse(saved) as Client[]; } catch { return demoClients; }
}

function writeLocal(clients: Client[]) { localStorage.setItem(demoKey, JSON.stringify(clients)); }
function localId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `client-${Date.now()}`; }


export function useClients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["clients", user?.id];
  const query = useQuery({ queryKey: key, enabled: Boolean(user), queryFn: () => hasSupabaseConfig ? listClients(user!.id) : readLocal() });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const create = useMutation({
    mutationFn: async (input: ClientInput) => {
      if (hasSupabaseConfig) return createClient(user!.id, input);
      const now = new Date().toISOString();
      const client: Client = { id: localId(), user_id: user!.id, phone: null, whatsapp: null, email: null, city: null, neighborhood: null, property_profile: null, budget_min: null, budget_max: null, payment_condition: null, bedrooms: null, notes: null, source: null, temperature: null, status: "lead", sale_date: null, next_follow_up: null, lat: null, lng: null, created_at: now, updated_at: now, ...input };
      writeLocal([client, ...readLocal()]);
      appendLocalClientActivity(user!.id, { client_id: client.id, type: "cadastro", title: "Cliente cadastrado", details: client.source ? `Origem: ${client.source}` : null });
      return client;
    }, onSuccess: invalidate
  });
  const update = useMutation({
    mutationFn: async ({ id, input, previousStatus }: { id: string; input: Partial<Client>; previousStatus?: Client["status"] }) => {
      if (hasSupabaseConfig) return updateClient(user!.id, id, input, previousStatus);
      let updated: Client | undefined;
      writeLocal(readLocal().map((client) => client.id === id ? (updated = { ...client, ...input, updated_at: new Date().toISOString() }) : client));
      if (!updated) throw new Error("Cliente não encontrado.");
      if (input.status && input.status !== previousStatus) appendLocalClientActivity(user!.id, { client_id: id, type: input.status === "venda realizada" ? "venda" : "mudança de etapa", title: `Etapa alterada para ${input.status}`, details: input.sale_date ? `Venda em ${input.sale_date}` : null });
      return updated;
    }, onSuccess: invalidate
  });
  return { clients: query.data ?? [], isLoading: query.isLoading, error: query.error, createClient: create, updateClient: update };
}
