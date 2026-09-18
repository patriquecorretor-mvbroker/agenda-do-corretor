import { requireSupabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";

export async function getProfile(userId: string) {
  const { data, error } = await (requireSupabase() as any).from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function upsertProfile(profile: Partial<Profile> & { user_id: string }) {
  const { data, error } = await (requireSupabase() as any)
    .from("profiles")
    .upsert(profile, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as Profile;
}
