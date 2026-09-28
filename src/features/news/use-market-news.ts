import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import type { MarketNews } from "@/types/database";
import { demoMarketNews } from "./news-data";

const localKey = "agenda-corretor-news-state-v1";
const queryKey = ["market-news"] as const;
type LocalState = Record<string, { saved?: boolean; read?: boolean }>;

function localState(): LocalState {
  try { return JSON.parse(localStorage.getItem(localKey) ?? "{}"); } catch { return {}; }
}

function demoList() {
  const state = localState();
  return demoMarketNews.map((item) => ({ ...item, ...state[item.id] }));
}

async function remoteList(): Promise<MarketNews[]> {
  const client = requireSupabase() as any;
  const [{ data: news, error }, { data: states }] = await Promise.all([
    client.from("market_news").select("*").eq("status", "publicada").order("published_at", { ascending: false }).limit(100),
    client.from("market_news_user_state").select("news_id,saved,read")
  ]);
  if (error) throw error;
  const byId = new Map((states ?? []).map((item: any) => [item.news_id, item]));
  return (news ?? []).map((item: MarketNews) => ({ ...item, ...(byId.get(item.id) ?? {}) }));
}

export function useMarketNews() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey, queryFn: async () => {
    if (!hasSupabaseConfig) return demoList();
    try { return await remoteList(); } catch { return demoList(); }
  }, staleTime: 5 * 60 * 1000 });

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

  async function refresh() {
    if (hasSupabaseConfig) {
      const { error } = await (requireSupabase() as any).functions.invoke("market-news-daily", { body: { mode: "manual" } });
      if (error) throw error;
    }
    await queryClient.invalidateQueries({ queryKey });
  }

  return { news: query.data ?? [], isLoading: query.isLoading, error: query.error, setState: stateMutation.mutateAsync, refresh };
}
