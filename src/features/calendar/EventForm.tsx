import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useEvents } from "@/features/calendar/use-events";
import type { CalendarEvent, EventType } from "@/types/database";

const types: EventType[] = ["visita", "reunião", "ligação", "follow-up", "captação", "plantão", "documentação", "conteúdo", "pessoal", "outro"];

export function EventForm({ event, onSaved }: { event?: CalendarEvent; onSaved?: () => void }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const { createEvent, updateEvent } = useEvents(event?.date ?? today);
  const { toast } = useToast();
  const loading = createEvent.isPending || updateEvent.isPending;

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const input = {
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      date: String(form.get("date") || today),
      start_time: String(form.get("start_time") || "09:00"),
      end_time: String(form.get("end_time") || "") || null,
      type: String(form.get("type") || "outro") as EventType,
      location: String(form.get("location") || "").trim() || null,
      status: event?.status ?? "agendado",
      notes: event?.notes ?? null
    };

    try {
      if (event) await updateEvent.mutateAsync({ id: event.id, input });
      else await createEvent.mutateAsync(input);
      toast({ title: event ? "Compromisso atualizado." : "Compromisso criado." });
      onSaved?.();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Erro ao salvar compromisso.", variant: "error" });
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" defaultValue={event?.title} placeholder="Visita com cliente" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <Input id="date" name="date" type="date" defaultValue={event?.date ?? today} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Tipo</Label>
          <Select name="type" defaultValue={event?.type ?? "visita"}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="start_time">Início</Label>
          <Input id="start_time" name="start_time" type="time" defaultValue={event?.start_time?.slice(0, 5) ?? "09:00"} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_time">Fim</Label>
          <Input id="end_time" name="end_time" type="time" defaultValue={event?.end_time?.slice(0, 5) ?? ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Local</Label>
        <Input id="location" name="location" defaultValue={event?.location ?? ""} placeholder="Endereço, escritório ou WhatsApp" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" defaultValue={event?.description ?? ""} placeholder="Observações rápidas do compromisso" />
      </div>
      <Button disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar compromisso
      </Button>
    </form>
  );
}
