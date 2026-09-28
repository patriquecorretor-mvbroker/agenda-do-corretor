import { useState } from "react";
import { format } from "date-fns";
import { Building2, Camera, FileSignature, House, Landmark, Loader2, ReceiptText, ScrollText, UserPlus, UserRoundCheck, UsersRound, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useEvents } from "@/features/calendar/use-events";
import { useClients } from "@/features/clients/use-clients";
import { BuildingPicker } from "@/features/buildings/BuildingPicker";
import { buildingAddress, useBuildings } from "@/features/buildings/use-buildings";
import { cn } from "@/lib/utils";
import type { CalendarEvent, EventType } from "@/types/database";

const eventActions: Array<{ title: string; type: EventType; icon: React.ElementType; needsClient?: boolean; needsProperty?: boolean }> = [
  { title: "Visitar cliente", type: "visita", icon: UserRoundCheck, needsClient: true, needsProperty: true },
  { title: "Mostrar imóvel", type: "visita", icon: House, needsClient: true, needsProperty: true },
  { title: "Tirar fotos", type: "conteúdo", icon: Camera, needsProperty: true },
  { title: "Fazer vídeo", type: "conteúdo", icon: Video, needsProperty: true },
  { title: "Registro", type: "documentação", icon: Landmark },
  { title: "Trocar IPTU", type: "documentação", icon: ReceiptText },
  { title: "Assinatura", type: "documentação", icon: FileSignature },
  { title: "Escritura", type: "documentação", icon: ScrollText },
  { title: "Reunião", type: "reunião", icon: UsersRound }
];

export function EventForm({ event, onSaved }: { event?: CalendarEvent; onSaved?: () => void }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const { createEvent, updateEvent } = useEvents(event?.date ?? today);
  const clients = useClients();
  const buildingCatalog = useBuildings();
  const { toast } = useToast();
  const initialAction = eventActions.find((action) => action.title.toLocaleLowerCase("pt-BR") === event?.title.toLocaleLowerCase("pt-BR")) ?? eventActions.find((action) => action.type === event?.type) ?? eventActions[0];
  const [selectedAction, setSelectedAction] = useState(initialAction.title);
  const [eventType, setEventType] = useState<EventType>(initialAction.type);
  const [clientChoice, setClientChoice] = useState(event?.client_id ?? "new");
  const [buildingId, setBuildingId] = useState<string | null>(event?.building_id ?? null);
  const loading = createEvent.isPending || updateEvent.isPending || clients.createClient.isPending;
  const actionConfig = eventActions.find((action) => action.title === selectedAction) ?? initialAction;
  const needsClient = Boolean(actionConfig.needsClient);
  const needsProperty = Boolean(actionConfig.needsProperty);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    try {
      let clientId = needsClient && clientChoice !== "new" ? clientChoice : null;
      if (needsClient && clientChoice === "new") {
        const clientName = String(form.get("client_name") || "").trim();
        if (!clientName) { toast({ title: "Informe o nome do novo cliente.", variant: "error" }); return; }
        const created = await clients.createClient.mutateAsync({ name: clientName, whatsapp: String(form.get("client_whatsapp") || "").trim() || null, city: String(form.get("client_city") || "").trim() || null, property_profile: String(form.get("client_profile") || "").trim() || null, status: "visita agendada", next_follow_up: String(form.get("date") || today), source: "Agenda" });
        clientId = created.id;
      }
      if (needsClient && eventType === "visita" && clientId) {
        const current = clients.clients.find((client) => client.id === clientId);
        if (current && current.status !== "visita agendada") await clients.updateClient.mutateAsync({ id: current.id, input: { status: "visita agendada", next_follow_up: String(form.get("date") || today) }, previousStatus: current.status });
      }
      const selectedBuilding = buildingCatalog.buildings.find((building) => building.id === buildingId);
      const typedLocation = String(form.get("location") || "").trim();
      const input = {
      title: selectedAction,
      description: String(form.get("description") || "").trim() || null,
      date: String(form.get("date") || today),
      start_time: String(form.get("start_time") || "09:00"),
      end_time: String(form.get("end_time") || "") || null,
      type: eventType,
      location: typedLocation || (selectedBuilding ? buildingAddress(selectedBuilding) : null),
      status: event?.status ?? "agendado",
      notes: event?.notes ?? null,
      client_id: clientId,
      building_id: needsProperty ? selectedBuilding?.id ?? null : null,
      apartment_number: needsProperty ? String(form.get("apartment_number") || "").trim() || null : null
      };
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
        <Label>Qual é o compromisso?</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {eventActions.map((action) => <button key={action.title} type="button" aria-pressed={selectedAction === action.title} onClick={() => { setSelectedAction(action.title); setEventType(action.type); }} className={cn("flex min-h-[74px] flex-col items-start justify-between rounded-xl border bg-card p-3 text-left text-xs font-semibold transition hover:border-primary/45 hover:bg-primary/5", selectedAction === action.title && "border-primary bg-primary/10 text-primary shadow-[0_8px_22px_hsl(var(--primary)/0.12)]")}>
            <action.icon className="h-4 w-4" />
            <span>{action.title}</span>
          </button>)}
        </div>
        {event && !eventActions.some((action) => action.title === event.title) && <p className="text-xs text-muted-foreground">O compromisso anterior “{event.title}” será atualizado para a categoria escolhida.</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="date">Data</Label>
        <Input id="date" name="date" type="date" defaultValue={event?.date ?? today} required />
      </div>
      {needsClient && <div className="space-y-3 rounded-lg border bg-muted/35 p-3">
        <div className="flex items-center gap-2 font-medium"><UserPlus className="h-4 w-4 text-primary" />Cliente da visita</div>
        <Select value={clientChoice} onValueChange={setClientChoice}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">Cadastrar novo cliente</SelectItem>{clients.clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent></Select>
        {clientChoice === "new" && <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="event-client-name">Nome</Label><Input id="event-client-name" name="client_name" placeholder="Nome do cliente" required /></div><div className="space-y-2"><Label htmlFor="event-client-whatsapp">WhatsApp</Label><Input id="event-client-whatsapp" name="client_whatsapp" inputMode="tel" /></div><div className="space-y-2"><Label htmlFor="event-client-city">Cidade</Label><Input id="event-client-city" name="client_city" /></div><div className="space-y-2"><Label htmlFor="event-client-profile">Perfil do imóvel</Label><Input id="event-client-profile" name="client_profile" placeholder="Ex.: apartamento 3 quartos" /></div></div>}
      </div>}
      {needsProperty && <div className="space-y-3 rounded-lg border bg-muted/35 p-3">
        <div className="flex items-center gap-2 font-medium"><Building2 className="h-4 w-4 text-primary" />Imóvel do compromisso</div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
          <div className="space-y-2"><Label>Edifício</Label><BuildingPicker value={buildingId} onChange={(building) => setBuildingId(building?.id ?? null)} /></div>
          <div className="space-y-2"><Label htmlFor="apartment_number">Nº do apartamento</Label><Input id="apartment_number" name="apartment_number" defaultValue={event?.apartment_number ?? ""} placeholder="Ex.: 804" /></div>
        </div>
      </div>}
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
