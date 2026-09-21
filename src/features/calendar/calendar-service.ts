import { requireSupabase } from "@/lib/supabase";
import type { CalendarEvent } from "@/types/database";

export async function listEvents(userId: string, date?: string) {
  let query = (requireSupabase() as any).from("calendar_events").select("*").eq("user_id", userId).order("date").order("start_time");
  if (date) query = query.eq("date", date);
  const { data, error } = await query;
  if (error) throw error;
  return data as CalendarEvent[];
}

export async function createEvent(input: CalendarEventInsert) {
  const { data, error } = await (requireSupabase() as any).from("calendar_events").insert(input).select("*").single();
  if (error) throw error;
  return data as CalendarEvent;
}

export async function updateEvent(id: string, userId: string, input: Partial<CalendarEvent>) {
  const { data, error } = await (requireSupabase() as any)
    .from("calendar_events")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data as CalendarEvent;
}

export async function deleteEvent(id: string, userId: string) {
  const { error } = await (requireSupabase() as any).from("calendar_events").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export type CalendarEventInsert = {
  user_id: string;
  title: string;
  description?: string | null;
  date: string;
  start_time: string;
  end_time?: string | null;
  type: CalendarEvent["type"];
  location?: string | null;
  status?: CalendarEvent["status"];
  notes?: string | null;
  client_id?: string | null;
};
