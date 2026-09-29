import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-context";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import type { MarketNews, MarketNewsSettings } from "@/types/database";
import { demoMarketNews } from "./news-data";

const localKey = "agenda-corretor-news-state-v1";
const settingsKey = "agenda-corretor-news-settings-v1";
const queryKey = ["market-news"] as const;
type LocalState = Record<string, { saved?: boolean; read?: boolean }>;
export const defaultMarketNewsSettings: MarketNewsSettings = {
  enabled: true,
  delivery_time: "07:30",
  categories: ["litoral", "mercado", "crédito", "investimento"],
  regions: ["Litoral Norte/RS", "Rio Grande do Sul", "Brasil"],
  push_enabled: false
};

function localState(): LocalState {
  try { return JSON.parse(localStorage.getItem(localKey) ?? "{}"); } catch { return {}; }
}

function demoList() {
  const state = localState();
  return demoMarketNews.map((item) => ({ ...item, ...state[item.id] }));
}

function localSettings(): MarketNewsSettings {
  try { return { ...defaultMarketNewsSettings, ...JSON.parse(localStorage.getItem(settingsKey) ?? "{}") }; }
  catch { return defaultMarketNewsSettings; }
}

function normalizeNews(item: MarketNews): MarketNews {
  return {
    ...item,
    audiences: item.audiences?.length ? item.audiences : ["comprador"],
    market_impact: item.market_impact ?? "neutro",
    objection: item.objection ?? "Como este cenário pode afetar minha decisão?",
    objection_response: item.objection_response ?? item.sales_argument,
    discovery_question: item.discovery_question ?? "Qual é a sua principal prioridade nesta decisão?"
  };
}

async function remoteList(): Promise<MarketNews[]> {
  const client = requireSupabase() as any;
  const [{ data: news, error }, { data: states }] = await Promise.all([
    client.from("market_news").select("*").eq("status", "publicada").order("published_at", { ascending: false }).limit(100),
    client.from("market_news_user_state").select("news_id,saved,read")
  ]);
  if (error) throw error;
  const byId = new Map((states ?? []).map((item: any) => [item.news_id, item]));
  return (news ?? []).map((item: MarketNews) => normalizeNews({ ...item, ...(byId.get(item.id) ?? {}) }));
}

export function useMarketNews() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey, queryFn: async () => {
    if (!hasSupabaseConfig) return demoList();
    try { return await remoteList(); } catch { return demoList(); }
  }, staleTime: 5 * 60 * 1000 });
  const settingsQuery = useQuery({
    queryKey: ["market-news-settings", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!hasSupabaseConfig) return localSettings();
      const client = requireSupabase() as any;
      const { data, error } = await client.from("market_news_settings").select("enabled,delivery_time,categories,regions,push_enabled").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return { ...defaultMarketNewsSettings, ...(data ?? {}) } as MarketNewsSettings;
    },
    staleTime: 5 * 60 * 1000
  });

  const stateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { saved?: boolean; read?: boolean } }) => {
      if (hasSupabaseConfig) {
        const client = requireSupabase() as any;
        const { data: auth } = await client.auth.getUser();
        if (!auth?.user) throw new Error("Sessão não encontrada");
        const { error } = await client.from("market_news_user_state").upsert({ user_id: auth.user.id, news_id: id, ...patch }, { onConflict: "user_id,news_id" });
        if (error) throw error;
      } else {
        const state = localState();
        state[id] = { ...state[id], ...patch };
        localStorage.setItem(localKey, JSON.stringify(state));
      }
      return { id, patch };
    },
    onSuccess: ({ id, patch }) => queryClient.setQueryData<MarketNews[]>(queryKey, (items = []) => items.map((item) => item.id === id ? { ...item, ...patch } : item))
  });

  const settingsMutation = useMutation({
    mutationFn: async (settings: MarketNewsSettings) => {
      if (hasSupabaseConfig) {
        const client = requireSupabase() as any;
        const { error } = await client.from("market_news_settings").upsert({ user_id: user!.id, ...settings }, { onConflict: "user_id" });
        if (error) throw error;
      } else localStorage.setItem(settingsKey, JSON.stringify(settings));
      return settings;
    },
    onSuccess: (settings) => queryClient.setQueryData(["market-news-settings", user?.id], settings)
  });

  async function refresh() {
    if (hasSupabaseConfig) {
      const { error } = await (requireSupabase() as any).functions.invoke("market-news-daily", { body: { mode: "manual" } });
      if (error) throw error;
    }
    await queryClient.invalidateQueries({ queryKey });
  }

  return {
    news: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    setState: stateMutation.mutateAsync,
    refresh,
    settings: settingsQuery.data ?? defaultMarketNewsSettings,
    saveSettings: settingsMutation.mutateAsync,
    isSavingSettings: settingsMutation.isPending
  };
}
