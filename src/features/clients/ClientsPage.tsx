import { useEffect, useRef, useState } from "react";
import { CalendarPlus, Camera, Check, Crown, ExternalLink, LocateFixed, MapPin, Navigation, Plus, Search, Trophy, Users, X, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEvents } from "@/features/calendar/use-events";
import { useAuth } from "@/features/auth/auth-context";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import type { CalendarEvent } from "@/types/database";
import { useClientMarks } from "./use-client-marks";
import { ClientAvatar } from "./ClientAvatar";
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
};

type MapTransform = {
  x: number;
  y: number;
  scale: number;
};

type TouchGesture =
  | {
      mode: "pan";
      startX: number;
      startY: number;
      originX: number;
      originY: number;
    }
  | {
      mode: "zoom";
      startDistance: number;
      startScale: number;
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
  const [scheduleClient, setScheduleClient] = useState<ClientMapItem | null>(null);
  const gestureMoved = useRef(false);
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
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapTransform, setMapTransform] = useState<MapTransform>({ x: 0, y: 0, scale: 1 });
  const touchGesture = useRef<TouchGesture | null>(null);
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
      city: commission.builder ?? "Carteira",
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
    return { ...client, photo: mark?.photo ?? ("photo" in client ? client.photo as string : undefined), bought: mark?.sold ?? client.bought };
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
  const mappedClients = positionClients(clients).filter((client) => filtered.some((item) => item.id === client.id) && matchesMapFilter(client, mapFilter));
  const selectedClient = mappedClients.find((client) => client.id === selectedClientId);
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
    const coordinates = coordinatesForCity(nextCity, index);
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
    toast({ title: "Cliente cadastrado no mapa." });
    event.currentTarget.reset();
  }

  function locateMe() {
    if (!navigator.geolocation) {
      toast({ title: "Geolocalização indisponível neste navegador." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        toast({ title: "Sua localização foi adicionada ao mapa." });
      },
      () => toast({ title: "Não foi possível acessar sua localização." }),
      { enableHighAccuracy: true, timeout: 8000 }
    );
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

  function handleMapTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    gestureMoved.current = false;
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      touchGesture.current = {
        mode: "pan",
        startX: touch.clientX,
        startY: touch.clientY,
        originX: mapTransform.x,
        originY: mapTransform.y
      };
    }
    if (event.touches.length === 2) {
      touchGesture.current = {
        mode: "zoom",
        startDistance: touchDistance(event.touches[0], event.touches[1]),
        startScale: mapTransform.scale
      };
    }
  }

  function handleMapTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    const gesture = touchGesture.current;
    if (!gesture) return;
    if (gesture.mode === "zoom" || Math.hypot(event.touches[0].clientX - gesture.startX, event.touches[0].clientY - gesture.startY) > 8) gestureMoved.current = true;
    if (gesture.mode === "pan" && event.touches.length === 1) {
      const touch = event.touches[0];
      setMapTransform((current) => ({
        ...current,
        x: clampPan(gesture.originX + touch.clientX - gesture.startX),
        y: clampPan(gesture.originY + touch.clientY - gesture.startY)
      }));
    }
    if (gesture.mode === "zoom" && event.touches.length === 2) {
      const nextDistance = touchDistance(event.touches[0], event.touches[1]);
      const nextScale = clampScale(gesture.startScale * (nextDistance / gesture.startDistance));
      setMapTransform((current) => ({
        ...current,
        scale: nextScale
      }));
    }
  }

  function handleMapTouchEnd() {
    touchGesture.current = null;
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setMapTransform((current) => ({
      ...current,
      scale: clampScale(current.scale + (event.deltaY > 0 ? -0.12 : 0.12))
    }));
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <section className="overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.34),_transparent_36%),linear-gradient(135deg,_#050403,_#15100b_58%,_#050403)] p-4 text-white shadow-soft md:rounded-[2rem] md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Users className="h-3.5 w-3.5" />
              Carteira de clientes
            </div>
            <h1 className="text-2xl font-semibold">Meus clientes</h1>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <HeroStat label="Clientes" value={clients.length} />
            <HeroStat label="Em contato" value={clients.filter((client) => client.stage === "em contato").length} />
            <HeroStat label="Compradores" value={clients.filter((client) => client.bought).length} />
          </div>
        </div>
      </section>

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

      <Card className="order-1">
        <CardHeader>
          <CardTitle>Filtros da carteira</CardTitle>
          <CardDescription>Filtre por perfil de imóvel, cidade, etapa ou busca livre.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-11" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedClientId(null); }} placeholder="Buscar cliente, bairro, imóvel..." />
          </div>
          <FilterSelect value={city} onValueChange={(value) => { setCity(value); setSelectedClientId(null); }} items={cities} placeholder="Cidade" />
          <FilterSelect value={profile} onValueChange={(value) => { setProfile(value); setSelectedClientId(null); }} items={profiles} placeholder="Perfil" />
          <FilterSelect value={stage} onValueChange={(value) => { setStage(value); setSelectedClientId(null); }} items={stages} placeholder="Etapa" />
        </CardContent>
      </Card>

      <Card className="order-5 overflow-hidden border-primary/20">
        <CardHeader className="bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.14),_transparent_38%),hsl(var(--card))]">
          <CardTitle>Cadastrar cliente de teste</CardTitle>
          <CardDescription>O cliente entra na carteira e aparece no mapa automaticamente.</CardDescription>
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
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={locateMe}>
              <LocateFixed className="h-4 w-4" />
              Minha localização
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-2" aria-label="Filtrar marcações do mapa">
              {([
                ["todos", "Todos", Users, "text-foreground"],
                ["vendi", "Vendi", Trophy, "text-emerald-600 dark:text-emerald-400"],
                ["visitei", "Visitei", Check, "text-sky-600 dark:text-sky-400"],
                ["agendadas", "Agendadas", CalendarPlus, "text-amber-600 dark:text-amber-400"],
                ["sem-visita", "Sem visita", MapPin, "text-muted-foreground"]
              ] as const).map(([value, label, Icon, color]) => (
                <button key={value} type="button" aria-pressed={mapFilter === value} onClick={() => { setMapFilter(value); setSelectedClientId(null); }} className={cn("inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors", mapFilter === value ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-background hover:bg-muted")}>
                  <Icon className={cn("h-4 w-4", color)} />{label}<span className="text-xs tabular-nums text-muted-foreground">{filtered.filter((client) => matchesMapFilter(client, value)).length}</span>
                </button>
              ))}
            </div>
            {(marks.error || scheduled.error) && <p role="alert" className="mb-3 text-sm text-destructive">Não foi possível carregar as marcações. <button className="underline" onClick={() => window.location.reload()}>Tentar novamente</button></p>}
            <div
              className="relative h-[440px] touch-none overflow-hidden rounded-lg border bg-zinc-100 text-foreground dark:bg-zinc-950 sm:h-[520px]"
              onClick={() => { if (!gestureMoved.current) setSelectedClientId(null); }}
              onTouchStart={handleMapTouchStart}
              onTouchMove={handleMapTouchMove}
              onTouchEnd={handleMapTouchEnd}
              onTouchCancel={handleMapTouchEnd}
              onWheel={handleWheel}
            >
              <div
                className="absolute inset-0 transition-transform duration-75 ease-out"
                style={{ transform: `translate3d(${mapTransform.x}px, ${mapTransform.y}px, 0) scale(${mapTransform.scale})` }}
              >
                <div className="absolute inset-x-8 top-1/2 h-px bg-white/10" />
                <div className="absolute inset-y-8 left-1/2 w-px bg-white/10" />
                <div className="absolute left-[12%] top-[28%] h-24 w-48 rotate-[-18deg] rounded-full border border-primary/20" />
                <div className="absolute bottom-[18%] right-[12%] h-28 w-56 rotate-[22deg] rounded-full border border-white/10" />
                {currentLocation && (
                  <div className="absolute left-1/2 top-1/2 z-10 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-sky-500 shadow-[0_0_0_8px_rgba(14,165,233,0.18)]" title="Sua localização">
                    <Navigation className="h-4 w-4" />
                  </div>
                )}
                {mappedClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={(event) => { event.stopPropagation(); if (!gestureMoved.current) setSelectedClientId(client.id); }}
                    aria-label={`Abrir ${client.name}${client.bought ? ", venda realizada" : ""}${visitedClientIds.has(client.id) ? ", visitado" : ""}${scheduledIds.has(client.id) || client.stage === "visita agendada" ? ", visita agendada" : ""}`}
                    aria-expanded={selectedClient?.id === client.id}
                    className={cn(
                      "absolute z-20 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-background shadow-lg transition hover:z-30 focus-visible:z-30 focus-visible:outline focus-visible:outline-4 focus-visible:outline-primary",
                      client.bought ? "border-emerald-500" : visitedClientIds.has(client.id) ? "border-sky-500" : scheduledIds.has(client.id) || client.stage === "visita agendada" ? "border-amber-500" : "border-zinc-400",
                      selectedClient?.id === client.id && "z-30 ring-4 ring-primary/40"
                    )}
                    style={{ left: `${client.x}%`, top: `${client.y}%` }}
                    title={`${client.name} - ${client.city}`}
                  >
                    <ClientAvatar name={client.name} photo={client.photo} />
                    <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-0.5">
                      {client.bought && <span className="rounded-full bg-emerald-600 p-1 text-white"><Trophy className="h-3 w-3" /></span>}
                      {visitedClientIds.has(client.id) && <span className="rounded-full bg-sky-600 p-1 text-white"><Check className="h-3 w-3" /></span>}
                      {(scheduledIds.has(client.id) || client.stage === "visita agendada") && <span className="rounded-full bg-amber-500 p-1 text-black"><CalendarPlus className="h-3 w-3" /></span>}
                    </span>
                  </button>
                ))}
              </div>
              {!mappedClients.length && <div className="absolute inset-0 grid place-content-center gap-3 p-8 text-center"><p>Nenhum cliente neste filtro.</p><Button variant="outline" onClick={() => { setMapFilter("todos"); setCity(allValue); setProfile(allValue); setStage(allValue); setQuery(""); }}>Limpar filtros</Button></div>}
              <button
                type="button"
                aria-label="Centralizar mapa" title="Centralizar mapa"
                onClick={(event) => { event.stopPropagation(); setMapTransform({ x: 0, y: 0, scale: 1 }); }}
                className="absolute right-3 top-3 z-30 grid h-11 w-11 place-items-center rounded-lg border bg-background text-foreground shadow-md"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
              {selectedClient && (
                <div className="mt-3 rounded-lg border bg-card p-4" aria-label={`Detalhes de ${selectedClient.name}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="h-12 w-12 shrink-0"><ClientAvatar name={selectedClient.name} photo={selectedClient.photo} /></div>
                    <div className="min-w-0">
                      <p className="break-words font-semibold">{selectedClient.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedClient.city} • {selectedClient.neighborhood}</p>
                    </div>
                    <Button variant="ghost" className="ml-auto h-11 w-11 shrink-0 p-0" aria-label="Fechar detalhes do cliente" onClick={() => setSelectedClientId(null)}><X className="h-5 w-5" /></Button>
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
                    <Button type="button" className="col-span-2 min-h-11" onClick={() => setScheduleClient(selectedClient)}><CalendarPlus className="h-4 w-4" />Agendar visita</Button>
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
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clientes filtrados</CardTitle>
            <CardDescription>{filtered.length} cliente(s) encontrados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filtered.map((client) => (
              <article key={client.id} className="rounded-3xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{client.name}</h3>
                    <p className="truncate text-sm text-muted-foreground">{client.city} • {client.neighborhood}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", client.bought ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "bg-primary/12 text-primary")}>
                    {client.stage}
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

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
      <p className="text-xs text-white/55">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
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

function positionClients(clients: ClientMapItem[]) {
  const withCoordinates = clients.map((client, index) => {
    if (client.lat !== undefined && client.lng !== undefined) return client;
    return { ...client, ...coordinatesForCity(client.city, index) };
  });
  const latValues = withCoordinates.map((client) => client.lat).filter((value): value is number => value !== undefined);
  const lngValues = withCoordinates.map((client) => client.lng).filter((value): value is number => value !== undefined);
  if (!latValues.length || !lngValues.length) return clients;

  const minLat = Math.min(...latValues);
  const maxLat = Math.max(...latValues);
  const minLng = Math.min(...lngValues);
  const maxLng = Math.max(...lngValues);
  const latRange = Math.max(maxLat - minLat, 0.01);
  const lngRange = Math.max(maxLng - minLng, 0.01);

  return withCoordinates.map((client, index) => {
    if (client.lat === undefined || client.lng === undefined) return client;
    const x = 12 + ((client.lng - minLng) / lngRange) * 76;
    const y = 14 + ((maxLat - client.lat) / latRange) * 72;
    return {
      ...client,
      x: clampMap(x + ((index % 3) - 1) * 2),
      y: clampMap(y + ((index % 2) ? 1.5 : -1.5))
    };
  });
}

function coordinatesForCity(city: string, index: number) {
  const normalized = city.trim().toLowerCase();
  const base = cityCoordinates[normalized];
  if (!base) return {};
  return {
    lat: base.lat + ((index % 5) - 2) * 0.012,
    lng: base.lng + ((index % 4) - 1.5) * 0.014
  };
}

function clampMap(value: number) {
  return Math.max(8, Math.min(92, value));
}

function clampPan(value: number) {
  return Math.max(-240, Math.min(240, value));
}

function clampScale(value: number) {
  return Math.max(1, Math.min(2.8, value));
}

function touchDistance(first: React.Touch, second: React.Touch) {
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}

function mapsUrl(client: ClientMapItem) {
  if (client.lat !== undefined && client.lng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${client.name} ${client.neighborhood} ${client.city}`)}`;
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
