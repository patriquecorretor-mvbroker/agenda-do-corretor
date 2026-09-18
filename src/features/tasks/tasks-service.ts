import { requireSupabase } from "@/lib/supabase";
import type { Task } from "@/types/database";

export async function listTasks(userId: string) {
  const { data, error } = await (requireSupabase() as any)
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("due_date", { nullsFirst: false })
    .order("due_time", { nullsFirst: false });
  if (error) throw error;
  return data as Task[];
}

export async function createTask(input: TaskInsert) {
  const { data, error } = await (requireSupabase() as any).from("tasks").insert(input).select("*").single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, userId: string, input: Partial<Task>) {
  const { data, error } = await (requireSupabase() as any)
    .from("tasks")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string, userId: string) {
  const { error } = await (requireSupabase() as any).from("tasks").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export type TaskInsert = {
  user_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  priority?: Task["priority"];
  status?: Task["status"];
};
