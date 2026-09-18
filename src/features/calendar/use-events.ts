import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEvent, deleteEvent, listEvents, updateEvent, type CalendarEventInsert } from "@/features/calendar/calendar-service";
import { useAuth } from "@/features/auth/auth-context";
import { demoEvents } from "@/lib/demo-data";
import type { CalendarEvent } from "@/types/database";

export function useEvents(date = format(new Date(), "yyyy-MM-dd")) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ["events", user?.id, date],
    queryFn: () => listEvents(user!.id, date),
    enabled: Boolean(user)
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["events", user?.id] });

  return {
    events: eventsQuery.data?.length ? eventsQuery.data : eventsQuery.data ?? demoEvents.filter((event) => event.date === date),
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error,
    createEvent: useMutation({
      mutationFn: (input: Omit<CalendarEventInsert, "user_id">) => createEvent({ ...input, user_id: user!.id }),
      onSuccess: invalidate
    }),
    updateEvent: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<CalendarEvent> }) => updateEvent(id, user!.id, input),
      onSuccess: invalidate
    }),
    deleteEvent: useMutation({
      mutationFn: (id: string) => deleteEvent(id, user!.id),
      onSuccess: invalidate
    })
  };
}
