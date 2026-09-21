import { useEffect, useState } from "react";
import { CalendarPlus, Camera, Check, Crown, ExternalLink, MapPin, Navigation, Plus, Search, Trophy, Users, X, SlidersHorizontal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEvents } from "@/features/calendar/use-events";
import { useAuth } from "@/features/auth/auth-context";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import type { CalendarEvent } from "@/types/database";
import { useClientMarks } from "./use-client-marks";
import { ClientAvatar } from "./ClientAvatar";
import { ClientMap } from "./ClientMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useFinance } from "@/features/finance/use-finance";

type ClientStage = "lead" | "em contato" | "visita agendada" | "comprador" | "pós-venda";

type ClientMapItem = {
  id: string;
  name: string;
  city: string;
  neighborhood: string;
  profile: string;
  stage: ClientStage;
  bought: boolean;
  downloads: number;
  x: number;
  y: number;
  lat?: number;
  lng?: number;
  photo?: string;
  locationPrecision?: "city" | "exact";
};

const demoClients: ClientMapItem[] = [
  { id: "1", name: "Mariana Alves", city: "São Paulo", neighborhood: "Mooca", profile: "Apartamento 2 quartos", stage: "visita agendada", bought: false, downloads: 9, x: 58, y: 50, lat: -23.558, lng: -46.596 },
  { id: "2", name: "Carlos Mendes", city: "São Paulo", neighborhood: "Tatuapé", profile: "Apartamento 2 quartos", stage: "comprador", bought: true, downloads: 12, x: 64, y: 44, lat: -23.540, lng: -46.576 },
  { id: "3", name: "Renata Lima", city: "Guarulhos", neighborhood: "Centro", profile: "Casa em condomínio", stage: "em contato", bought: false, downloads: 5, x: 70, y: 31, lat: -23.454, lng: -46.533 },
  { id: "4", name: "Felipe Rocha", city: "Santo André", neighborhood: "Campestre", profile: "Studio", stage: "lead", bought: false, downloads: 4, x: 62, y: 67, lat: -23.654, lng: -46.536 },
  { id: "5", name: "Aline Souza", city: "São Bernardo", neighborhood: "Jardim do Mar", profile: "Apartamento 3 quartos", stage: "comprador", bought: true, downloads: 8, x: 52, y: 75, lat: -23.695, lng: -46.552 },
  { id: "6", name: "Bruno Costa", city: "Osasco", neighborhood: "Centro", profile: "Apartamento 2 quartos", stage: "pós-venda", bought: true, downloads: 7, x: 34, y: 50, lat: -23.532, lng: -46.792 },
  { id: "7", name: "Patrícia Gomes", city: "Barueri", neighborhood: "Alphaville", profile: "Casa em condomínio", stage: "em contato", bought: false, downloads: 11, x: 25, y: 42, lat: -23.497, lng: -46.850 },
  { id: "8", name: "Eduardo Nunes", city: "Campinas", neighborhood: "Cambuí", profile: "Apartamento alto padrão", stage: "lead", bought: false, downloads: 6, x: 18, y: 28, lat: -22.900, lng: -47.057 },
  { id: "9", name: "Bianca Reis", city: "Sorocaba", neighborhood: "Campolim", profile: "Casa em condomínio", stage: "visita agendada", bought: false, downloads: 10, x: 23, y: 78, lat: -23.501, lng: -47.458 },
  { id: "10", name: "Rafael Martins", city: "Santos", neighborhood: "Ponta da Praia", profile: "Apartamento vista mar", stage: "comprador", bought: true, downloads: 14, x: 76, y: 84, lat: -23.985, lng: -46.296 }
];

const allValue = "todos";
const clientStorageKey = "mv-broker-clients";
const visitStorageKey = "mv-broker-client-visits";
const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  "são paulo": { lat: -23.5558, lng: -46.6396 },
  "sao paulo": { lat: -23.5558, lng: -46.6396 },
  guarulhos: { lat: -23.4543, lng: -46.5337 },
  "santo andre": { lat: -23.6639, lng: -46.5383 },
  "santo andré": { lat: -23.6639, lng: -46.5383 },
  "são bernardo": { lat: -23.6914, lng: -46.5646 },
  "sao bernardo": { lat: -23.6914, lng: -46.5646 },
  osasco: { lat: -23.5329, lng: -46.7918 },
  barueri: { lat: -23.5112, lng: -46.8764 },
  campinas: { lat: -22.9056, lng: -47.0608 },
  sorocaba: { lat: -23.5015, lng: -47.4526 },
  santos: { lat: -23.9608, lng: -46.3336 }
};

export function ClientsPage() {
  const finance = useFinance();
  const { toast } = useToast();
  const { user, isDemo } = useAuth();
  const marks = useClientMarks();
  const calendar = useEvents();
  const [mapFilter, setMapFilter] = useState("todos");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [scheduleClient, setScheduleClient] = useState<ClientMapItem | null>(null);
  const scheduled = useQuery({
    queryKey: ["events", user?.id, "client-map"],
    enabled: Boolean(user),
    queryFn: async (): Promise<CalendarEvent[]> => {
      if (!hasSupabaseConfig) return (JSON.parse(localStorage.getItem("agenda-demo-events") ?? "[]") as CalendarEvent[]).filter((event) => event.notes?.startsWith("client-map:") && event.status === "agendado");
      const { data, error } = await (requireSupabase() as any).from("calendar_events").select("*").eq("user_id", user!.id).eq("status", "agendado").like("notes", "client-map:%").order("date");
      if (error) throw error;
      return data;
    }
  });
  const [customClients, setCustomClients] = useState<ClientMapItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(clientStorageKey) ?? "[]") as ClientMapItem[];
    } catch {
      return [];
    }
  });
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(allValue);
  const [profile, setProfile] = useState(allValue);
  const [stage, setStage] = useState(allValue);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [legacyVisits] = useState<Array<{ clientId: string; date: string }>>(() => {
    try {
      return JSON.parse(localStorage.getItem(visitStorageKey) ?? "[]") as Array<{ clientId: string; date: string }>;
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(clientStorageKey, JSON.stringify(customClients));
  }, [customClients]);

  const visitLog = [...(isDemo ? legacyVisits : []), ...marks.marks.flatMap((mark) => (mark.visits ?? []).map((date) => ({ clientId: mark.client_id, date })))];
  const visitedClientIds = new Set(visitLog.map((visit) => visit.clientId));
  const scheduledIds = new Set((scheduled.data ?? []).map((event) => event.notes?.slice("client-map:".length)));

  const financeClients = finance.commissions
    .filter((commission) => commission.client)
    .map((commission, index) => ({
      id: `sale-${commission.id}`,
      name: commission.client ?? "Cliente",
      city: "Cidade não informada",
      neighborhood: commission.builder ?? "Venda vinculada",
      profile: commission.property ?? commission.development ?? "Imóvel vendido",
      stage: "comprador" as ClientStage,
      bought: true,
      downloads: 1,
      x: 42 + (index % 4) * 8,
      y: 38 + (index % 3) * 12
    }));

  const clients: ClientMapItem[] = [...(isDemo ? demoClients.map((client, index) => ({ ...client, photo: `https://i.pravatar.cc/96?img=${[47,12,44,13,49,14,45,15,48,16][index]}` })) : []), ...financeClients, ...customClients].map((client) => {
    const mark = marks.marks.find((item) => item.client_id === client.id);
    const coordinates = client.id.startsWith("custom-") && (!("locationPrecision" in client) || client.locationPrecision !== "exact") ? coordinatesForCity(client.city) : {};
    return { ...client, ...coordinates, photo: mark?.photo ?? ("photo" in client ? client.photo as string : undefined), bought: mark?.sold ?? client.bought };
  });
  const cities = Array.from(new Set(clients.map((client) => client.city)));
  const profiles = Array.from(new Set(clients.map((client) => client.profile)));
  const stages = Array.from(new Set(clients.map((client) => client.stage)));

  const filtered = clients.filter((client) => {
    const matchesQuery = `${client.name} ${client.city} ${client.neighborhood} ${client.profile}`.toLowerCase().includes(query.toLowerCase());
    const matchesCity = city === allValue || client.city === city;
    const matchesProfile = profile === allValue || client.profile === profile;
    const matchesStage = stage === allValue || client.stage === stage;
    return matchesQuery && matchesCity && matchesProfile && matchesStage;
  });

  const profileChampion = topBy(clients, (client) => client.profile, (client) => client.downloads);
  const cityChampion = topBy(clients, (client) => client.city);
  const citySalesChampion = topBy(clients.filter((client) => client.bought), (client) => client.city);
  const matchesMapFilter = (client: ClientMapItem, filter: string) => filter === "todos" || (filter === "vendi" && client.bought) || (filter === "visitei" && visitedClientIds.has(client.id)) || (filter === "agendadas" && (scheduledIds.has(client.id) || client.stage === "visita agendada")) || (filter === "sem-visita" && !visitedClientIds.has(client.id));
  const visibleClients = filtered.filter((client) => matchesMapFilter(client, mapFilter));
  const mappedClients = visibleClients.filter((client): client is ClientMapItem & { lat: number; lng: number } => Number.isFinite(client.lat) && Number.isFinite(client.lng) && Math.abs(client.lat!) <= 90 && Math.abs(client.lng!) <= 180);
  const selectedClient = visibleClients.find((client) => client.id === selectedClientId);
  const now = new Date();
  const visitsThisMonth = visitLog.filter((visit) => isSameMonthKey(visit.date, now)).length;
  const visitsThisYear = visitLog.filter((visit) => new Date(visit.date).getFullYear() === now.getFullYear()).length;
  const selectedClientVisits = selectedClient ? visitLog.filter((visit) => visit.clientId === selectedClient.id) : [];
  const selectedVisitedToday = selectedClient ? visitLog.some((visit) => visit.clientId === selectedClient.id && isTodayKey(visit.date)) : false;

  function addClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const nextCity = String(form.get("city") || "").trim();
    const nextProfile = String(form.get("profile") || "").trim();
    if (!name || !nextCity || !nextProfile) return;
    const index = customClients.length + demoClients.length;
    const coordinates = coordinatesForCity(nextCity);
    const next: ClientMapItem = {
      id: `custom-${Date.now()}`,
      name,
      city: nextCity,
      neighborhood: String(form.get("neighborhood") || "").trim() || "Bairro não informado",
      profile: nextProfile,
      stage: String(form.get("stage") || "lead") as ClientStage,
      bought: form.get("bought") === "on",
      downloads: Number(form.get("downloads") || 1),
      x: 18 + (index * 13) % 66,
      y: 24 + (index * 17) % 58,
      ...coordinates
    };
    setCustomClients((current) => [...current, next]);
    setCity(nextCity);
    setSelectedClientId(null);
    toast({ title: coordinates.lat !== undefined ? "Cliente cadastrado com localização aproximada." : "Cliente cadastrado. Localização não identificada." });
    event.currentTarget.reset();
  }

  async function markVisit(client: ClientMapItem) {
    if (marks.save.isPending || visitLog.some((visit) => visit.clientId === client.id && isTodayKey(visit.date))) return;
    try {
      const previous = marks.marks.find((mark) => mark.client_id === client.id);
      await marks.save.mutateAsync({ client_id: client.id, visits: [...(previous?.visits ?? []), new Date().toISOString()] });
      toast({ title: `Visita a ${client.name} registrada.` });
    } catch { toast({ title: "Não foi possível registrar a visita. Tente novamente.", variant: "error" }); }
  }

  async function markSold(client: ClientMapItem) {
    try {
      await marks.save.mutateAsync({ client_id: client.id, sold: !client.bought });
      toast({ title: client.bought ? "Marcação de venda removida." : "Cliente marcado como venda realizada." });
    } catch { toast({ title: "Não foi possível salvar a marcação.", variant: "error" }); }
  }

  async function changePhoto(client: ClientMapItem, file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 300000) {
      toast({ title: "Escolha uma foto JPG, PNG ou WebP de até 300 KB.", variant: "error" });
      return;
    }
    try {
      const photo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await marks.save.mutateAsync({ client_id: client.id, photo });
      toast({ title: "Foto atualizada." });
    } catch { toast({ title: "Não foi possível salvar a foto.", variant: "error" }); }
  }

  async function scheduleVisit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!scheduleClient || calendar.createEvent.isPending) return;
    const form = new FormData(event.currentTarget);
    const date = String(form.get("date"));
    const time = String(form.get("time"));
    if (new Date(`${date}T${time}`).getTime() <= Date.now()) {
      toast({ title: "Escolha uma data e horário futuros.", variant: "error" }); return;
    }
    try {
      await calendar.createEvent.mutateAsync({ title: `Visita: ${scheduleClient.name}`, date, start_time: time, type: "visita", status: "agendado", location: `${scheduleClient.neighborhood}, ${scheduleClient.city}`, notes: `client-map:${scheduleClient.id}` });
      setScheduleClient(null);
      toast({ title: "Visita adicionada à agenda." });
    } catch { toast({ title: "Não foi possível agendar. Seus dados foram mantidos.", variant: "error" }); }
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Meus clientes</h1><p className="mt-1 text-sm text-muted-foreground">{clients.length} clientes · {clients.filter((client) => client.bought).length} compradores</p></div>
        {isDemo && <span className="rounded-lg border px-3 py-1 text-xs text-muted-foreground">Demonstração</span>}
      </header>

      <section className="order-3 grid gap-3 md:grid-cols-3">
        <ChampionCard icon={Crown} label="Perfil mais baixado" value={profileChampion?.label ?? "Dados insuficientes"} helper={`${profileChampion?.score ?? 0} interações`} />
        <ChampionCard icon={MapPin} label="Cidade campeã" value={cityChampion?.label ?? "Dados insuficientes"} helper={`${cityChampion?.score ?? 0} clientes`} />
        <ChampionCard icon={Trophy} label="Cidade que mais vendeu" value={citySalesChampion?.label ?? "Dados insuficientes"} helper={`${citySalesChampion?.score ?? 0} vendas`} />
      </section>

      <section className="order-4 grid gap-3 md:grid-cols-3">
        <ChampionCard icon={Check} label="Visitas feitas no mês" value={String(visitsThisMonth)} helper="clientes marcados como visitados" />
        <ChampionCard icon={Navigation} label="Visitas no ano" value={String(visitsThisYear)} helper={`${now.getFullYear()} até agora`} />
        <ChampionCard icon={Users} label="Clientes já visitados" value={String(visitedClientIds.size)} helper="clientes únicos com check" />
      </section>

      <section className="order-1 flex min-w-0 items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Buscar clientes" className="pl-11" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedClientId(null); }} placeholder="Cliente, cidade ou bairro..." />
        </div>
        <Button variant="outline" className="min-h-11 shrink-0" onClick={() => setFiltersOpen(true)}><SlidersHorizontal className="h-4 w-4" />Filtros{[city, profile, stage].filter((value) => value !== allValue).length > 0 && <span>{[city, profile, stage].filter((value) => value !== allValue).length}</span>}</Button>
        <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Filtrar clientes</DialogTitle><DialogDescription>Cidade, perfil de imóvel e etapa.</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <FilterSelect value={city} onValueChange={(value) => { setCity(value); setSelectedClientId(null); }} items={cities} placeholder="Cidade" />
              <FilterSelect value={profile} onValueChange={(value) => { setProfile(value); setSelectedClientId(null); }} items={profiles} placeholder="Perfil" />
              <FilterSelect value={stage} onValueChange={(value) => { setStage(value); setSelectedClientId(null); }} items={stages} placeholder="Etapa" />
              <div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={() => { setCity(allValue); setProfile(allValue); setStage(allValue); setMapFilter(allValue); setQuery(""); setSelectedClientId(null); }}>Limpar filtros</Button><Button onClick={() => setFiltersOpen(false)}>Ver {filtered.length} clientes</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </section>

      <Card className="order-5 overflow-hidden border-primary/20">
        <CardHeader className="bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.14),_transparent_38%),hsl(var(--card))]">
          <CardTitle>Cadastrar cliente de teste</CardTitle>
          <CardDescription>Cidades reconhecidas aparecem com localização aproximada.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_0.8fr_0.8fr_0.9fr_0.7fr_auto]" onSubmit={addClient}>
            <Field name="name" label="Cliente" placeholder="Nome do cliente" required />
            <Field name="city" label="Cidade" placeholder="Ex.: São Paulo" required />
            <Field name="neighborhood" label="Bairro" placeholder="Ex.: Mooca" />
            <Field name="profile" label="Perfil de imóvel" placeholder="Ex.: Casa em condomínio" required />
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select name="stage" defaultValue="lead">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["lead", "em contato", "visita agendada", "comprador", "pós-venda"] as ClientStage[]).map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="min-h-11 w-full" type="submit">
                <Plus className="h-4 w-4" />
                Salvar
              </Button>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border p-3 md:col-span-2 xl:col-span-2">
              <input id="bought" name="bought" type="checkbox" className="h-4 w-4" />
              <Label htmlFor="bought">Cliente já comprou</Label>
            </div>
            <Field name="downloads" label="Interações/downloads" type="number" placeholder="1" />
          </form>
        </CardContent>
      </Card>

      <div className="order-2 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Mapa de clientes</CardTitle>
              <CardDescription>{mappedClients.length} clientes{isDemo ? " · Demonstração" : ""}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar marcações do mapa">
              {([
                ["todos", "Todos", Users, "text-foreground"],
                ["vendi", "Vendi", Trophy, "text-emerald-600 dark:text-emerald-400"],
                ["visitei", "Visitei", Check, "text-sky-600 dark:text-sky-400"],
                ["agendadas", "Agendadas", CalendarPlus, "text-amber-600 dark:text-amber-400"],
                ["sem-visita", "Sem visita", MapPin, "text-muted-foreground"]
              ] as const).map(([value, label, Icon, color]) => (
                <button key={value} type="button" aria-pressed={mapFilter === value} onClick={() => { setMapFilter(value); setSelectedClientId(null); }} className={cn("inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors", mapFilter === value ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-background hover:bg-muted")}>
                  <Icon className={cn("h-4 w-4", color)} />{label}<span className="text-xs tabular-nums text-muted-foreground">{filtered.filter((client) => matchesMapFilter(client, value)).length}</span>
                </button>
              ))}
            </div>
            {(marks.error || scheduled.error) && <p role="alert" className="mb-3 text-sm text-destructive">Não foi possível carregar as marcações. <button className="underline" onClick={() => window.location.reload()}>Tentar novamente</button></p>}
            <ClientMap
              clients={mappedClients.map((client) => ({ ...client, visited: visitedClientIds.has(client.id), scheduled: scheduledIds.has(client.id) || client.stage === "visita agendada" }))}
              onSelect={setSelectedClientId}
              emptyMessage={visibleClients.length ? "Clientes sem localização conhecida. Consulte a lista." : "Nenhum cliente corresponde aos filtros."}
            />
            {visibleClients.length > mappedClients.length && <p className="mt-3 text-sm text-muted-foreground">{visibleClients.length - mappedClients.length} cliente(s) sem localização conhecida na lista.</p>}
              <Dialog open={Boolean(selectedClient)} onOpenChange={(open) => { if (!open) setSelectedClientId(null); }}>
                {selectedClient && <DialogContent className="sm:max-w-md">
                  <DialogHeader><DialogTitle>{selectedClient.name}</DialogTitle><DialogDescription>{selectedClient.city} • {selectedClient.neighborhood}</DialogDescription></DialogHeader>
                  <p className="mb-3 text-xs text-muted-foreground">{selectedClient.id.startsWith("custom-") && selectedClient.locationPrecision !== "exact" ? "Localização aproximada: centro da cidade." : isDemo && !selectedClient.id.startsWith("sale-") ? "Localização demonstrativa." : ""}</p>
                <div aria-label={`Detalhes de ${selectedClient.name}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0"><ClientAvatar name={selectedClient.name} photo={selectedClient.photo} /></div>
                    <span className="text-sm text-muted-foreground">{selectedClient.bought ? "Venda realizada" : selectedClient.stage}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <MapMini label="Perfil" value={selectedClient.profile} />
                    <MapMini label="Visitas feitas" value={selectedClientVisits.length} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" className="min-h-11" disabled={marks.save.isPending || selectedVisitedToday || marks.loading || Boolean(marks.error)} onClick={() => markVisit(selectedClient)}>
                      <Check className="h-4 w-4" />
                      {selectedVisitedToday ? "Visitado hoje" : "Visitei"}
                    </Button>
                    <Button type="button" variant="outline" className={cn("min-h-11", selectedClient.bought && "text-emerald-600")} aria-pressed={selectedClient.bought} disabled={marks.save.isPending || marks.loading || Boolean(marks.error)} onClick={() => markSold(selectedClient)}><Trophy className="h-4 w-4" />{selectedClient.bought ? "Vendido" : "Vendi"}</Button>
                    <Button type="button" className="col-span-2 min-h-11" onClick={() => { setScheduleClient(selectedClient); setSelectedClientId(null); }}><CalendarPlus className="h-4 w-4" />Agendar visita</Button>
                    <a
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold"
                      href={mapsUrl(selectedClient)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Rota
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <label className="relative inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium"><Camera className="h-4 w-4" />Foto<input aria-label={`Foto de ${selectedClient.name}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={marks.save.isPending || marks.loading || Boolean(marks.error)} className="absolute inset-0 w-full cursor-pointer opacity-0" onChange={(event) => { void changePhoto(selectedClient, event.target.files?.[0]); event.target.value = ""; }} /></label>
                  </div>
                  {(scheduled.data ?? []).filter((event) => event.notes === `client-map:${selectedClient.id}`).map((event) => <div key={event.id} className="mt-3 flex items-center justify-between gap-2 border-t pt-3 text-sm"><span>Visita: {formatVisitDate(`${event.date}T${event.start_time}`)}</span><Button variant="ghost" disabled={calendar.updateEvent.isPending} aria-label="Cancelar visita" onClick={async () => { try { await calendar.updateEvent.mutateAsync({ id: event.id, input: { status: "cancelado" } }); toast({ title: "Visita cancelada." }); } catch { toast({ title: "Não foi possível cancelar.", variant: "error" }); } }}><X className="h-4 w-4" /></Button></div>)}
                  {selectedClientVisits[0] && (
                    <p className="mt-2 text-xs text-muted-foreground">Última visita: {formatVisitDate(selectedClientVisits[selectedClientVisits.length - 1].date)}</p>
                  )}
                </div>
                </DialogContent>}
              </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clientes filtrados</CardTitle>
            <CardDescription>{visibleClients.length} cliente(s) encontrados.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[650px] space-y-3 overflow-y-auto">
            {!visibleClients.length && <div className="py-8 text-center text-sm text-muted-foreground"><p>Nenhum cliente encontrado.</p><Button className="mt-3" variant="outline" onClick={() => { setCity(allValue); setProfile(allValue); setStage(allValue); setQuery(""); setMapFilter(allValue); }}>Limpar filtros</Button></div>}
            {visibleClients.map((client) => (
              <article key={client.id} className="rounded-3xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button className="flex min-h-11 items-center gap-3 text-left font-semibold hover:text-primary" onClick={() => setSelectedClientId(client.id)}><span className="h-10 w-10 shrink-0"><ClientAvatar name={client.name} photo={client.photo} /></span><span className="break-words">{client.name}</span></button>
                    <p className="truncate text-sm text-muted-foreground">{client.city} • {client.neighborhood}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", client.bought ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "bg-primary/12 text-primary")}>
                    {client.bought ? "Venda realizada" : scheduledIds.has(client.id) ? "Visita agendada" : client.stage}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Mini label="Perfil" value={client.profile} />
                  <Mini label="Visitas" value={visitLog.filter((visit) => visit.clientId === client.id).length} />
                </div>
                <Button className="mt-3 w-full" variant="outline" size="sm" disabled={marks.save.isPending || marks.loading || Boolean(marks.error) || visitLog.some((visit) => visit.clientId === client.id && isTodayKey(visit.date))} onClick={() => markVisit(client)}>
                  <Check className="h-4 w-4" />
                  Marcar visita feita
                </Button>
              </article>
            ))}
          </CardContent>
        </Card>
      </div>
      <Dialog open={Boolean(scheduleClient)} onOpenChange={(open) => { if (!open && !calendar.createEvent.isPending) setScheduleClient(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agendar visita</DialogTitle><DialogDescription>{scheduleClient?.name}</DialogDescription></DialogHeader>
          <form onSubmit={scheduleVisit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="visit-date">Data</Label><Input id="visit-date" name="date" type="date" min={format(new Date(), "yyyy-MM-dd")} defaultValue={format(new Date(), "yyyy-MM-dd")} required /></div>
            <div className="space-y-2"><Label htmlFor="visit-time">Horário</Label><Input id="visit-time" name="time" type="time" required /></div>
            <Button className="min-h-11 w-full" disabled={calendar.createEvent.isPending}>{calendar.createEvent.isPending ? "Salvando..." : "Confirmar visita"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterSelect({ value, onValueChange, items, placeholder }: { value: string; onValueChange: (value: string) => void; items: string[]; placeholder: string }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={allValue}>{placeholder}: todos</SelectItem>
        {items.map((item) => (
          <SelectItem key={item} value={item}>{item}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ChampionCard({ icon: Icon, label, value, helper }: { icon: React.ElementType; label: string; value: string; helper: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <Icon className="mb-4 h-5 w-5 text-primary" />
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-xl font-semibold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function MapMini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted p-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-semibold">{value}</p>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} placeholder={placeholder} required={required} />
    </div>
  );
}

function topBy(items: ClientMapItem[], labeler: (item: ClientMapItem) => string, scorer: (item: ClientMapItem) => number = () => 1) {
  const groups = items.reduce<Record<string, number>>((acc, item) => {
    const label = labeler(item);
    acc[label] = (acc[label] ?? 0) + scorer(item);
    return acc;
  }, {});
  const [label, score] = Object.entries(groups).sort((a, b) => b[1] - a[1])[0] ?? [];
  return label ? { label, score } : null;
}

function coordinatesForCity(city: string) {
  const base = cityCoordinates[city.trim().toLowerCase()];
  return { lat: base?.lat, lng: base?.lng, locationPrecision: "city" as const };
}

function mapsUrl(client: ClientMapItem) {
  if (client.locationPrecision === "exact" && client.lat !== undefined && client.lng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${client.neighborhood} ${client.city}`)}`;
}

function isSameMonthKey(date: string, reference: Date) {
  const parsed = new Date(date);
  return parsed.getFullYear() === reference.getFullYear() && parsed.getMonth() === reference.getMonth();
}

function isTodayKey(date: string) {
  const parsed = new Date(date);
  const now = new Date();
  return parsed.toDateString() === now.toDateString();
}

function formatVisitDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}
