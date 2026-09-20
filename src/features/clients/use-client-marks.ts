import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-context";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";

export type ClientMark = { client_id: string; sold?: boolean; photo?: string; visits?: string[] };

export function useClientMarks() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const key = ["client-marks", user?.id];
  const storageKey = `mv-broker-client-marks:${user?.id}`;
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(user),
    queryFn: async (): Promise<ClientMark[]> => {
      if (!hasSupabaseConfig) return JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      const { data, error } = await (requireSupabase() as any).from("client_map_marks").select("client_id,sold,photo,visits").eq("user_id", user!.id);
      if (error) throw error;
      return data;
    }
  });
  const save = useMutation({
    mutationFn: async (mark: ClientMark) => {
      if (!user) throw new Error("Entre na sua conta para salvar.");
      const previous = query.data?.find((item) => item.client_id === mark.client_id);
      const next = { ...previous, ...mark };
      if (hasSupabaseConfig) {
        const { error } = await (requireSupabase() as any).from("client_map_marks").upsert({ ...next, user_id: user.id }, { onConflict: "user_id,client_id" });
        if (error) throw error;
      } else {
        localStorage.setItem(storageKey, JSON.stringify([...(query.data ?? []).filter((item) => item.client_id !== mark.client_id), next]));
      }
      return next;
    },
    onSuccess: (mark) => cache.setQueryData<ClientMark[]>(key, (current = []) => [...current.filter((item) => item.client_id !== mark.client_id), mark])
  });
  return { marks: query.data ?? [], loading: query.isLoading, error: query.error, save };
}
