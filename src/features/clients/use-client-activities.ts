import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-context";
import { hasSupabaseConfig } from "@/lib/supabase";
import type { Client, ClientActivity, ClientActivityType } from "@/types/database";
import { createClientActivity, listClientActivities } from "./client-service";

const activityStorageKey = "mv-broker-client-activities";

type ActivityInput = {
  client_id: string;
  type: ClientActivityType;
  title: string;
  details?: string | null;
};

function readLocalActivities(): ClientActivity[] {
  try {
    return JSON.parse(localStorage.getItem(activityStorageKey) ?? "[]") as ClientActivity[];
  } catch {
    return [];
  }
}

export function appendLocalClientActivity(userId: string, input: ActivityInput) {
  const now = new Date().toISOString();
  const activity: ClientActivity = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `activity-${Date.now()}`,
    user_id: userId,
    client_id: input.client_id,
    type: input.type,
    title: input.title,
    details: input.details ?? null,
    occurred_at: now,
    created_at: now
  };
  try {
    localStorage.setItem(activityStorageKey, JSON.stringify([activity, ...readLocalActivities()]));
  } catch {
    // A linha do tempo continua disponível na sessão mesmo se o navegador bloquear armazenamento.
  }
  return activity;
}

export function useClientActivities(client?: Client) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["client-activities", user?.id, client?.id];
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(user && client),
    queryFn: async () => {
      if (hasSupabaseConfig) return listClientActivities(user!.id, client!.id);
      const activities = readLocalActivities().filter((activity) => activity.client_id === client!.id);
      if (activities.length) return activities;
      return [{
        id: `created-${client!.id}`,
        user_id: user!.id,
        client_id: client!.id,
        type: "cadastro" as const,
        title: "Cliente cadastrado",
        details: client!.source ? `Origem: ${client!.source}` : null,
        occurred_at: client!.created_at,
        created_at: client!.created_at
      }];
    }
  });
  const create = useMutation({
    mutationFn: (input: Omit<ActivityInput, "client_id">) => {
      const activity = { ...input, client_id: client!.id };
      return hasSupabaseConfig ? createClientActivity(user!.id, activity) : Promise.resolve(appendLocalClientActivity(user!.id, activity));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key })
  });

  return { activities: query.data ?? [], isLoading: query.isLoading, error: query.error, createActivity: create };
}

export function useCreateClientActivity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ActivityInput) => hasSupabaseConfig
      ? createClientActivity(user!.id, input)
      : Promise.resolve(appendLocalClientActivity(user!.id, input)),
    onSuccess: (_activity, input) => {
      queryClient.invalidateQueries({ queryKey: ["client-activities", user?.id, input.client_id] });
    }
  });
}
