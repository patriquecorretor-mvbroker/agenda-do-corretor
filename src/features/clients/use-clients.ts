import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-context";
import { hasSupabaseConfig } from "@/lib/supabase";
import type { Client } from "@/types/database";
import { createClient, listClients, updateClient, type ClientInput } from "./client-service";

const demoKey = "mv-broker-crm-clients";

const demoClients: Client[] = [
  demoClient("crm-1", "Mariana Alves", "visita agendada", "São Paulo", "Apartamento 2 quartos", 1),
  demoClient("crm-2", "Renata Lima", "em contato", "Guarulhos", "Casa em condomínio", 3),
  demoClient("crm-3", "Patrícia Gomes", "qualificado", "Barueri", "Casa em condomínio", 5),
  demoClient("crm-4", "Bianca Reis", "proposta", "Sorocaba", "Casa em condomínio", 2),
  { ...demoClient("crm-5", "Carlos Mendes", "venda realizada", "São Paulo", "Apartamento 2 quartos", 12), sale_date: "2025-10-05", next_follow_up: "2026-10-05" },
  { ...demoClient("crm-6", "Aline Souza", "pós-venda", "São Bernardo", "Apartamento 3 quartos", 20), sale_date: "2025-09-25", next_follow_up: "2026-09-25" }
];

function readLocal(): Client[] {
  try { const saved = localStorage.getItem(demoKey); return saved === null ? demoClients : JSON.parse(saved) as Client[]; } catch { return demoClients; }
}

function writeLocal(clients: Client[]) { localStorage.setItem(demoKey, JSON.stringify(clients)); }
function localId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `client-${Date.now()}`; }

function demoClient(id: string, name: string, status: Client["status"], city: string, property: string, followUpDays: number): Client {
  const followUp = new Date(); followUp.setDate(followUp.getDate() + followUpDays);
  const now = new Date().toISOString();
  return { id, user_id: "demo-user", name, phone: null, whatsapp: "5511999999999", email: null, city, neighborhood: null, property_profile: property, budget_min: null, budget_max: null, bedrooms: null, notes: null, source: "Demonstração", status, sale_date: null, next_follow_up: followUp.toISOString().slice(0, 10), lat: null, lng: null, created_at: now, updated_at: now };
}

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
      const client: Client = { id: localId(), user_id: user!.id, phone: null, whatsapp: null, email: null, city: null, neighborhood: null, property_profile: null, budget_min: null, budget_max: null, bedrooms: null, notes: null, source: null, status: "lead", sale_date: null, next_follow_up: null, lat: null, lng: null, created_at: now, updated_at: now, ...input };
      writeLocal([client, ...readLocal()]);
      return client;
    }, onSuccess: invalidate
  });
  const update = useMutation({
    mutationFn: async ({ id, input, previousStatus }: { id: string; input: Partial<Client>; previousStatus?: Client["status"] }) => {
      if (hasSupabaseConfig) return updateClient(user!.id, id, input, previousStatus);
      let updated: Client | undefined;
      writeLocal(readLocal().map((client) => client.id === id ? (updated = { ...client, ...input, updated_at: new Date().toISOString() }) : client));
      if (!updated) throw new Error("Cliente não encontrado.");
      return updated;
    }, onSuccess: invalidate
  });
  return { clients: query.data ?? [], isLoading: query.isLoading, error: query.error, createClient: create, updateClient: update };
}
