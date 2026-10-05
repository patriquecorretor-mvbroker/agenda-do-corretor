import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEvent, deleteEvent, listEvents, updateEvent, type CalendarEventInsert } from "@/features/calendar/calendar-service";
import { useAuth } from "@/features/auth/auth-context";
import { demoEvents } from "@/lib/demo-data";
import { hasSupabaseConfig } from "@/lib/supabase";
import type { CalendarEvent } from "@/types/database";

const eventsKey = "agenda-demo-events";

function readDemoEvents() {
  const saved = localStorage.getItem(eventsKey);
  return saved ? (JSON.parse(saved) as CalendarEvent[]) : demoEvents;
}

function writeDemoEvents(events: CalendarEvent[]) {
  localStorage.setItem(eventsKey, JSON.stringify(events));
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `local-${Date.now()}`;
}

export type EventPeriod = string | { from: string; to: string };

export function useEvents(period: EventPeriod = format(new Date(), "yyyy-MM-dd")) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const from = typeof period === "string" ? period : period.from;
  const to = typeof period === "string" ? period : period.to;

  const eventsQuery = useQuery({
    queryKey: ["events", user?.id, from, to],
    queryFn: () => (hasSupabaseConfig ? listEvents(user!.id, from, to === from ? undefined : to) : readDemoEvents().filter((event) => event.date >= from && event.date <= to)),
    enabled: Boolean(user)
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["events", user?.id] });

  return {
    events: eventsQuery.data ?? [],
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error,
    createEvent: useMutation({
      mutationFn: async (input: Omit<CalendarEventInsert, "user_id">) => {
        if (hasSupabaseConfig) return createEvent({ ...input, user_id: user!.id });
        const next: CalendarEvent = {
          id: createId(),
          user_id: user!.id,
          title: input.title,
          description: input.description ?? null,
          date: input.date,
          start_time: input.start_time,
          end_time: input.end_time ?? null,
          type: input.type,
          location: input.location ?? null,
          status: input.status ?? "agendado",
          notes: input.notes ?? null,
          client_id: input.client_id ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        writeDemoEvents([...readDemoEvents(), next]);
        return next;
      },
      onSuccess: invalidate
    }),
    updateEvent: useMutation({
      mutationFn: async ({ id, input }: { id: string; input: Partial<CalendarEvent> }) => {
        if (hasSupabaseConfig) return updateEvent(id, user!.id, input);
        let updated = readDemoEvents().find((event) => event.id === id);
        const next = readDemoEvents().map((event) => {
          if (event.id !== id) return event;
          updated = { ...event, ...input, updated_at: new Date().toISOString() };
          return updated;
        });
        writeDemoEvents(next);
        return updated!;
      },
      onSuccess: invalidate
    }),
    deleteEvent: useMutation({
      mutationFn: async (id: string) => {
        if (hasSupabaseConfig) return deleteEvent(id, user!.id);
        writeDemoEvents(readDemoEvents().filter((event) => event.id !== id));
      },
      onSuccess: invalidate
    })
  };
}
