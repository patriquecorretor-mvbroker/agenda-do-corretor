import { useState } from "react";
import { ArrowLeft, Bot, Building2, CalendarClock, CalendarPlus, Camera, Check, ChevronRight, CircleDollarSign, Crown, ExternalLink, Grid2X2, Layers3, LayoutList, LocateFixed, Map, MapPin, Megaphone, MessageCircle, Phone, Plus, Route, Search, SlidersHorizontal, Thermometer, Trophy, UserRoundSearch, Users, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEvents } from "@/features/calendar/use-events";
import { useAuth } from "@/features/auth/auth-context";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import type { CalendarEvent, Client, ClientStatus, ClientTemperature } from "@/types/database";
import { useClientMarks } from "./use-client-marks";
import { ClientAvatar } from "./ClientAvatar";
import { ClientMap } from "./ClientMap";
import { useClients } from "./use-clients";
import { AiClientIntake } from "./AiClientIntake";
import { ClientDetailDialog } from "./ClientDetailDialog";
import { ClientForm } from "./ClientForm";
import type { ClientInput } from "./client-service";
import { Button } from "@/components/ui/button";
import { RouteButton } from "@/components/RouteButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn, formatCurrency } from "@/lib/utils";
import { buildingAddress, useBuildings } from "@/features/buildings/use-buildings";

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
  whatsapp?: string;
  locationPrecision?: "city" | "exact";
  crmStatus?: ClientStatus;
  budgetMin?: number;
  budgetMax?: number;
  paymentCondition?: string;
  bedrooms?: number;
  nextFollowUp?: string;
  phone?: string;
  source?: string;
  temperature?: ClientTemperature;
};

type ClientView = "list" | "cards" | "map";
type ClientMapLayer = "clients" | "nearby" | "visits" | "sales" | "buildings" | "compatible";
type InsightFilter = "all" | "active" | "followups-today" | "negotiations" | "sales" | "visited-month" | "visited-year" | "visited";

const funnelStatuses: Array<{ value: ClientStatus | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "lead", label: "Lead" },
  { value: "em contato", label: "Em contato" },
  { value: "qualificado", label: "Qualificado" },
  { value: "visita agendada", label: "Visita" },
  { value: "proposta", label: "Proposta" },
  { value: "negociação", label: "Negociação" },
  { value: "venda realizada", label: "Venda" },
  { value: "pós-venda", label: "Pós-venda" }
];

const demoClients: ClientMapItem[] = [
  { id: "1", name: "Mariana Alves", city: "São Paulo", neighborhood: "Mooca", profile: "Apartamento 2 quartos", stage: "visita agendada", bought: false, downloads: 9, x: 58, y: 50, lat: -23.558, lng: -46.596, whatsapp: "5511999990001" },
  { id: "2", name: "Carlos Mendes", city: "São Paulo", neighborhood: "Tatuapé", profile: "Apartamento 2 quartos", stage: "comprador", bought: true, downloads: 12, x: 64, y: 44, lat: -23.540, lng: -46.576, whatsapp: "5511999990002" },
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
  const { toast } = useToast();
  const { user, isDemo } = useAuth();
  const marks = useClientMarks();
  const calendar = useEvents();
  const crm = useClients();
  const buildingCatalog = useBuildings();
  const [mapFilter, setMapFilter] = useState("todos");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [citiesOpen, setCitiesOpen] = useState(false);
  const [cityExplorer, setCityExplorer] = useState<string | null>(null);
  const [neighborhoodExplorer, setNeighborhoodExplorer] = useState(allValue);
  const [createMode, setCreateMode] = useState<"manual" | "ai" | null>(null);
  const [selectedCrmId, setSelectedCrmId] = useState<string>();
  const [compactClientId, setCompactClientId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client>();
  const [clientView, setClientView] = useState<ClientView>("list");
  const [funnelStage, setFunnelStage] = useState<ClientStatus | "all">("all");
  const [scheduleClient, setScheduleClient] = useState<ClientMapItem | null>(null);
  const [saleClient, setSaleClient] = useState<ClientMapItem | null>(null);
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
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(allValue);
  const [profile, setProfile] = useState(allValue);
  const [stage, setStage] = useState(allValue);
  const [source, setSource] = useState(allValue);
  const [insightFilter, setInsightFilter] = useState<InsightFilter>("all");
  const [cardFilterLabel, setCardFilterLabel] = useState<string | null>(null);
  const [paymentCondition, setPaymentCondition] = useState(allValue);
  const [budgetFrom, setBudgetFrom] = useState("");
  const [budgetTo, setBudgetTo] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [mapDetailsOpen, setMapDetailsOpen] = useState(false);
  const [mapLayer, setMapLayer] = useState<ClientMapLayer>("clients");
  const [visibleMapIds, setVisibleMapIds] = useState<string[] | null>(null);
  const [routeMode, setRouteMode] = useState(false);
  const [routeClientIds, setRouteClientIds] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [legacyVisits] = useState<Array<{ clientId: string; date: string }>>(() => {
    try {
      return JSON.parse(localStorage.getItem(visitStorageKey) ?? "[]") as Array<{ clientId: string; date: string }>;
    } catch {
      return [];
    }
  });

  const visitLog = [...(isDemo ? legacyVisits : []), ...marks.marks.flatMap((mark) => (mark.visits ?? []).map((date) => ({ clientId: mark.client_id, date })))];
  const visitedClientIds = new Set(visitLog.map((visit) => visit.clientId));
  const now = new Date();
  const todayKey = format(now, "yyyy-MM-dd");
  const visitedThisMonthIds = new Set(visitLog.filter((visit) => isSameMonthKey(visit.date, now)).map((visit) => visit.clientId));
  const visitedThisYearIds = new Set(visitLog.filter((visit) => new Date(visit.date).getFullYear() === now.getFullYear()).map((visit) => visit.clientId));
  const scheduledIds = new Set((scheduled.data ?? []).map((event) => event.notes?.slice("client-map:".length)));

  const clients: ClientMapItem[] = crm.clients.map((client, index) => {
    const demo = isDemo ? demoClients.find((item) => normalizeText(item.name) === normalizeText(client.name)) : undefined;
    const mark = marks.marks.find((item) => item.client_id === client.id);
    const city = client.city ?? demo?.city ?? "Cidade não informada";
    const storedCoordinates = client.lat !== null && client.lng !== null ? { lat: client.lat, lng: client.lng } : undefined;
    const coordinates = storedCoordinates ?? (demo?.lat !== undefined && demo.lng !== undefined ? { lat: demo.lat, lng: demo.lng } : coordinatesForCity(city));
    const bought = client.status === "venda realizada" || client.status === "pós-venda";
    return {
      id: client.id,
      name: client.name,
      city,
      neighborhood: client.neighborhood ?? demo?.neighborhood ?? "Bairro não informado",
      profile: client.property_profile ?? demo?.profile ?? "Perfil não informado",
      stage: clientStatusToMapStage(client.status),
      bought: mark?.sold ?? bought,
      downloads: demo?.downloads ?? 0,
      x: demo?.x ?? 30 + (index % 6) * 8,
      y: demo?.y ?? 30 + (index % 5) * 10,
      ...coordinates,
      locationPrecision: storedCoordinates || demo?.lat !== undefined ? "exact" : "city",
      photo: mark?.photo ?? (isDemo ? `https://i.pravatar.cc/96?img=${[47, 44, 49, 45, 12, 13, 14, 15][index % 8]}` : undefined),
      whatsapp: client.whatsapp ?? client.phone ?? demo?.whatsapp ?? undefined,
      phone: client.phone ?? undefined,
      crmStatus: client.status,
      budgetMin: client.budget_min ?? undefined,
      budgetMax: client.budget_max ?? undefined,
      paymentCondition: client.payment_condition ?? undefined,
      bedrooms: client.bedrooms ?? undefined,
      nextFollowUp: client.next_follow_up ?? undefined,
      source: client.source ?? undefined,
      temperature: client.temperature ?? undefined
    };
  });
  const cities = Array.from(new Set(clients.map((client) => client.city)));
  const profiles = Array.from(new Set(clients.map((client) => client.profile)));
  const stages = Array.from(new Set(clients.map((client) => client.stage)));
  const paymentConditions = Array.from(new Set(clients.map((client) => client.paymentCondition).filter((value): value is string => Boolean(value))));

  const filtered = clients.filter((client) => {
    const matchesQuery = `${client.name} ${client.city} ${client.neighborhood} ${client.profile} ${client.source ?? ""} ${client.temperature ?? ""} ${client.paymentCondition ?? ""} ${client.budgetMin ?? ""} ${client.budgetMax ?? ""}`.toLowerCase().includes(query.toLowerCase());
    const matchesCity = city === allValue || client.city === city;
    const matchesProfile = profile === allValue || client.profile === profile;
    const matchesStage = stage === allValue || client.stage === stage;
    const matchesSource = source === allValue || (client.crmStatus !== undefined && client.source === source);
    const matchesPayment = paymentCondition === allValue || client.paymentCondition === paymentCondition;
    const minValue = budgetFrom ? Number(budgetFrom) : null;
    const maxValue = budgetTo ? Number(budgetTo) : null;
    const clientMin = client.budgetMin ?? client.budgetMax;
    const clientMax = client.budgetMax ?? client.budgetMin;
    const matchesValue = minValue === null && maxValue === null ? true : clientMin !== undefined && clientMax !== undefined && (minValue === null || clientMax >= minValue) && (maxValue === null || clientMin <= maxValue);
    const matchesFunnel = funnelStage === "all" || client.crmStatus === funnelStage;
    const status = client.crmStatus ?? mapStageToClientStatus(client.stage);
    const matchesInsight = insightFilter === "all"
      || (insightFilter === "active" && client.crmStatus !== undefined && !["venda realizada", "pós-venda", "perdido"].includes(status))
      || (insightFilter === "followups-today" && client.crmStatus !== undefined && client.nextFollowUp === todayKey)
      || (insightFilter === "negotiations" && client.crmStatus !== undefined && ["proposta", "negociação"].includes(status))
      || (insightFilter === "sales" && client.bought)
      || (insightFilter === "visited-month" && visitedThisMonthIds.has(client.id))
      || (insightFilter === "visited-year" && visitedThisYearIds.has(client.id))
      || (insightFilter === "visited" && visitedClientIds.has(client.id));
    return matchesQuery && matchesCity && matchesProfile && matchesStage && matchesSource && matchesPayment && matchesValue && matchesFunnel && matchesInsight;
  });

  const profileChampion = topBy(clients, (client) => client.profile, (client) => client.downloads);
  const cityChampion = topBy(clients, (client) => client.city);
  const citySalesChampion = topBy(clients.filter((client) => client.bought), (client) => client.city);
  const matchesMapFilter = (client: ClientMapItem, filter: string) => filter === "todos" || (filter === "vendi" && client.bought) || (filter === "visitei" && visitedClientIds.has(client.id)) || (filter === "agendadas" && (scheduledIds.has(client.id) || client.stage === "visita agendada")) || (filter === "sem-visita" && !visitedClientIds.has(client.id));
  const visibleClients = filtered.filter((client) => matchesMapFilter(client, mapFilter));
  const mappedClients = visibleClients.filter((client): client is ClientMapItem & { lat: number; lng: number } => Number.isFinite(client.lat) && Number.isFinite(client.lng) && Math.abs(client.lat!) <= 90 && Math.abs(client.lng!) <= 180);
  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const selectedBuilding = buildingCatalog.buildings.find((building) => building.id === selectedBuildingId);
  const compactClient = clients.find((client) => client.id === compactClientId);
  const visitsThisMonth = visitLog.filter((visit) => isSameMonthKey(visit.date, now)).length;
  const visitsThisYear = visitLog.filter((visit) => new Date(visit.date).getFullYear() === now.getFullYear()).length;
  const selectedClientVisits = selectedClient ? visitLog.filter((visit) => visit.clientId === selectedClient.id) : [];
  const selectedVisitedToday = selectedClient ? visitLog.some((visit) => visit.clientId === selectedClient.id && isTodayKey(visit.date)) : false;
  const selectedCrmClient = crm.clients.find((client) => client.id === selectedCrmId);
  const activeClients = crm.clients.filter((client) => !["venda realizada", "pós-venda", "perdido"].includes(client.status)).length;
  const followUpsToday = crm.clients.filter((client) => client.next_follow_up === todayKey).length;
  const scheduledVisits = crm.clients.filter((client) => client.status === "visita agendada").length;
  const negotiations = crm.clients.filter((client) => ["proposta", "negociação"].includes(client.status)).length;
  const attentionClients = crm.clients
    .filter((client) => !["venda realizada", "pós-venda", "perdido"].includes(client.status))
    .sort((a, b) => attentionScore(b, now) - attentionScore(a, now))
    .slice(0, 5);
  const sourcePerformance = acquisitionPerformance(crm.clients);
  const activeFilterCount = [city, profile, stage, source, paymentCondition].filter((value) => value !== allValue).length + (insightFilter !== "all" ? 1 : 0) + (budgetFrom ? 1 : 0) + (budgetTo ? 1 : 0);
  const cityGroups = groupClientsByCity(clients);
  const cityExplorerClients = cityExplorer ? clients.filter((client) => client.city === cityExplorer) : [];
  const cityNeighborhoods = Array.from(new Set(cityExplorerClients.map((client) => client.neighborhood).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const neighborhoodClients = cityExplorerClients.filter((client) => neighborhoodExplorer === allValue || client.neighborhood === neighborhoodExplorer);
  const nearbyClients = userLocation
    ? mappedClients.map((client) => ({ client, distance: distanceKm(userLocation, { lat: client.lat, lng: client.lng }) })).filter((item) => item.distance <= 30).sort((a, b) => a.distance - b.distance)
    : [];
  const compatibleNeighborhoods = new Set(filtered.map((client) => normalizeText(client.neighborhood)).filter((value) => value && !value.includes("nao informado")));
  const mapLayerClients = mapLayer === "visits" ? mappedClients.filter((client) => scheduledIds.has(client.id) || client.stage === "visita agendada")
    : mapLayer === "sales" ? mappedClients.filter((client) => client.bought)
    : mapLayer === "nearby" ? nearbyClients.map((item) => item.client)
    : mappedClients;
  const mapBuildings = mapLayer === "compatible"
    ? buildingCatalog.buildings.filter((building) => compatibleNeighborhoods.has(normalizeText(building.neighborhood)))
    : buildingCatalog.buildings;
  const clientMapPoints = (mapLayer === "buildings" || mapLayer === "compatible")
    ? mapBuildings.map((building) => ({ id: `${mapLayer === "compatible" ? "compatible" : "building"}:${building.id}`, name: building.name, city: building.neighborhood, lat: building.latitude, lng: building.longitude, bought: false, visited: false, scheduled: false, kind: mapLayer === "compatible" ? "compatible" as const : "building" as const, urgency: "normal" as const }))
    : mapLayerClients.map((client) => ({ ...client, visited: visitedClientIds.has(client.id), scheduled: scheduledIds.has(client.id) || client.stage === "visita agendada", kind: "client" as const, urgency: mapUrgency(client, todayKey) }));
  const synchronizedClients = (visibleMapIds ? mapLayerClients.filter((client) => visibleMapIds.includes(client.id)) : mapLayerClients).slice(0, 10);

  function clearClientFilters() {
    setCity(allValue);
    setProfile(allValue);
    setStage(allValue);
    setSource(allValue);
    setInsightFilter("all");
    setCardFilterLabel(null);
    setPaymentCondition(allValue);
    setBudgetFrom("");
    setBudgetTo("");
    setFunnelStage("all");
    setMapFilter(allValue);
    setQuery("");
    setSelectedClientId(null);
  }

  function applyCardFilter(label: string, options: { insight?: InsightFilter; city?: string; profile?: string; source?: string; funnel?: ClientStatus; view?: ClientView; mapFilter?: string } = {}) {
    clearClientFilters();
    setCardFilterLabel(label);
    if (options.insight) setInsightFilter(options.insight);
    if (options.city) setCity(options.city);
    if (options.profile) setProfile(options.profile);
    if (options.source) setSource(options.source);
    if (options.funnel) setFunnelStage(options.funnel);
    if (options.view) setClientView(options.view);
    if (options.mapFilter) setMapFilter(options.mapFilter);
    window.setTimeout(() => document.getElementById("client-map-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function openCityExplorer(cityName?: string) {
    setCityExplorer(cityName ?? null);
    setNeighborhoodExplorer(allValue);
    setCitiesOpen(true);
  }

  function locateClientOnMap(client: ClientMapItem) {
    setCitiesOpen(false);
    setCompactClientId(null);
    setSelectedCrmId(undefined);
    setQuery("");
    setCity(allValue);
    setProfile(allValue);
    setStage(allValue);
    setSource(allValue);
    setInsightFilter("all");
    setCardFilterLabel(null);
    setPaymentCondition(allValue);
    setBudgetFrom("");
    setBudgetTo("");
    setFunnelStage("all");
    setMapFilter("todos");
    setClientView("map");
    setMapLayer("clients");
    setVisibleMapIds(null);
    setSelectedClientId(client.id);
    window.setTimeout(() => document.getElementById("client-map-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function selectMapPoint(id: string) {
    setMapDetailsOpen(false);
    if (id.startsWith("building:") || id.startsWith("compatible:")) {
      setSelectedClientId(null);
      setSelectedBuildingId(id.split(":").slice(1).join(":"));
      return;
    }
    setSelectedBuildingId(null);
    setSelectedClientId(id);
  }

  function chooseMapLayer(layer: ClientMapLayer) {
    setSelectedClientId(null);
    setSelectedBuildingId(null);
    setVisibleMapIds(null);
    if (layer === "nearby" && !userLocation) {
      requestUserLocation(() => setMapLayer("nearby"));
      return;
    }
    setMapLayer(layer);
  }

  function requestUserLocation(after?: () => void) {
    if (!navigator.geolocation) {
      toast({ title: "Localização indisponível neste navegador.", variant: "error" });
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      after?.();
    }, () => toast({ title: "Autorize a localização para encontrar clientes próximos.", variant: "error" }), { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true });
  }

  function toggleRouteClient(id: string) {
    setRouteClientIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 8) {
        toast({ title: "A rota aceita até 8 clientes por vez." });
        return current;
      }
      return [...current, id];
    });
  }

  function openPlannedRoute() {
    const stops = routeClientIds.map((id) => mappedClients.find((client) => client.id === id)).filter((client): client is ClientMapItem & { lat: number; lng: number } => Boolean(client));
    if (!stops.length) return;
    const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : `${stops[0].lat},${stops[0].lng}`;
    const destination = stops.length === 1 ? `${stops[0].lat},${stops[0].lng}` : `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
    const waypoints = stops.slice(userLocation ? 0 : 1, -1).map((client) => `${client.lat},${client.lng}`).join("|");
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""}`, "_blank", "noopener,noreferrer");
  }

  async function createCrmClient(input: ClientInput) {
    try {
      await crm.createClient.mutateAsync(withAnniversaryFollowUp(input));
      setCreateMode(null);
      toast({ title: "Cliente cadastrado." });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Não foi possível salvar.", variant: "error" });
    }
  }

  async function editCrmClient(input: ClientInput) {
    if (!editingClient) return;
    try {
      await crm.updateClient.mutateAsync({ id: editingClient.id, input: withAnniversaryFollowUp(input), previousStatus: editingClient.status });
      setEditingClient(undefined);
      toast({ title: "Cliente atualizado." });
    } catch {
      toast({ title: "Não foi possível atualizar.", variant: "error" });
    }
  }

  async function changeCrmStatus(client: Client, next: ClientStatus) {
    if (next === "venda realizada" && !client.sale_date) {
      setSelectedCrmId(undefined);
      setEditingClient(client);
      toast({ title: "Informe a data da venda para concluir esta etapa." });
      return false;
    }
    try {
      await crm.updateClient.mutateAsync({ id: client.id, input: { status: next }, previousStatus: client.status });
      toast({ title: `${client.name}: ${next}.` });
      return true;
    } catch {
      toast({ title: "Não foi possível alterar a etapa.", variant: "error" });
      return false;
    }
  }

  async function changeFollowUp(client: Client, date: string | null) {
    try {
      await crm.updateClient.mutateAsync({ id: client.id, input: { next_follow_up: date }, previousStatus: client.status });
      return true;
    } catch {
      toast({ title: "Não foi possível atualizar o follow-up.", variant: "error" });
      return false;
    }
  }

  async function changeTemperature(client: Client, temperature: ClientTemperature) {
    try {
      await crm.updateClient.mutateAsync({ id: client.id, input: { temperature }, previousStatus: client.status });
      toast({ title: `${client.name} marcado como ${temperature}.` });
      return true;
    } catch {
      toast({ title: "Não foi possível atualizar a temperatura.", variant: "error" });
      return false;
    }
  }

  async function changeCardStatus(client: ClientMapItem, status: ClientStatus) {
    if (status === "venda realizada" && !client.bought) { setSaleClient(client); return; }
    const registered = await ensureCrmClient(client);
    if (!registered) return;
    await changeCrmStatus(registered, status);
  }

  async function changeCardTemperature(client: ClientMapItem, temperature: ClientTemperature) {
    const registered = await ensureCrmClient(client);
    if (!registered) return;
    await changeTemperature(registered, temperature);
  }

  async function ensureCrmClient(client: ClientMapItem) {
    const existing = crm.clients.find((item) => item.id === client.id || item.name.toLocaleLowerCase("pt-BR") === client.name.toLocaleLowerCase("pt-BR"));
    if (existing) return existing;
    try {
      return await crm.createClient.mutateAsync({ name: client.name, phone: client.phone ?? null, whatsapp: client.whatsapp ?? null, city: client.city, neighborhood: client.neighborhood, property_profile: client.profile, budget_min: client.budgetMin ?? null, budget_max: client.budgetMax ?? null, payment_condition: client.paymentCondition ?? null, bedrooms: client.bedrooms ?? null, source: client.source ?? "Carteira importada", temperature: client.temperature ?? "morno", status: mapStageToClientStatus(client.stage), lat: client.locationPrecision === "exact" ? client.lat : null, lng: client.locationPrecision === "exact" ? client.lng : null });
    } catch {
      toast({ title: "Não foi possível adicionar este contato ao CRM.", variant: "error" });
      return null;
    }
  }

  async function openClient(client: ClientMapItem) {
    if (clientView === "list") {
      setCompactClientId(client.id);
      return;
    }
    if (clientView === "cards") {
      const registered = await ensureCrmClient(client);
      if (registered) setSelectedCrmId(registered.id);
    } else {
      setClientView("map");
      setSelectedClientId(client.id);
    }
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
    if (!client.bought) { setSaleClient(client); return; }
    if (crm.clients.some((item) => item.id === client.id)) { toast({ title: "A venda está registrada. Edite o cliente no processo de vendas para alterar." }); return; }
    try {
      await marks.save.mutateAsync({ client_id: client.id, sold: !client.bought });
      toast({ title: client.bought ? "Marcação de venda removida." : "Cliente marcado como venda realizada." });
    } catch { toast({ title: "Não foi possível salvar a marcação.", variant: "error" }); }
  }

  async function completeSale(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!saleClient) return;
    const saleDate = String(new FormData(event.currentTarget).get("sale_date") || "");
    if (!saleDate || new Date(`${saleDate}T12:00:00`) > new Date()) { toast({ title: "Informe uma data de venda válida.", variant: "error" }); return; }
    try {
      let registered = crm.clients.find((client) => client.id === saleClient.id || client.name.toLocaleLowerCase("pt-BR") === saleClient.name.toLocaleLowerCase("pt-BR"));
      const followUp = nextSaleAnniversary(saleDate);
      if (!registered) registered = await crm.createClient.mutateAsync({ name: saleClient.name, city: saleClient.city, neighborhood: saleClient.neighborhood, property_profile: saleClient.profile, status: "venda realizada", sale_date: saleDate, next_follow_up: followUp, source: "Mapa de clientes" });
      else registered = await crm.updateClient.mutateAsync({ id: registered.id, input: { status: "venda realizada", sale_date: saleDate, next_follow_up: followUp }, previousStatus: registered.status });
      await marks.save.mutateAsync({ client_id: saleClient.id, sold: true });
      setSaleClient(null);
      toast({ title: "Venda registrada e follow-up de aniversário programado." });
    } catch { toast({ title: "Não foi possível registrar a venda.", variant: "error" }); }
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
      let registered = crm.clients.find((client) => client.id === scheduleClient.id || client.name.toLocaleLowerCase("pt-BR") === scheduleClient.name.toLocaleLowerCase("pt-BR"));
      if (!registered) {
        registered = await crm.createClient.mutateAsync({ name: scheduleClient.name, city: scheduleClient.city, neighborhood: scheduleClient.neighborhood, property_profile: scheduleClient.profile, status: "visita agendada", next_follow_up: date, source: "Mapa de clientes", lat: scheduleClient.locationPrecision === "exact" ? scheduleClient.lat : null, lng: scheduleClient.locationPrecision === "exact" ? scheduleClient.lng : null });
      } else if (registered.status !== "visita agendada") {
        registered = await crm.updateClient.mutateAsync({ id: registered.id, input: { status: "visita agendada", next_follow_up: date }, previousStatus: registered.status });
      }
      await calendar.createEvent.mutateAsync({ title: `Visita: ${scheduleClient.name}`, date, start_time: time, type: "visita", status: "agendado", location: `${scheduleClient.neighborhood}, ${scheduleClient.city}`, notes: `client-map:${scheduleClient.id}`, client_id: registered.id });
      setScheduleClient(null);
      toast({ title: "Cliente cadastrado e visita adicionada à agenda." });
    } catch { toast({ title: "Não foi possível agendar. Seus dados foram mantidos.", variant: "error" }); }
  }

  return (
    <div className="flex min-w-0 flex-col gap-5 text-[#0B1220] dark:text-foreground">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0"><div className="flex items-center gap-2"><h1 className="text-3xl font-semibold tracking-normal">Clientes</h1>{isDemo && <span className="rounded-full bg-[#B89A6A]/12 px-2 py-1 text-[11px] font-semibold text-[#8A6E42]">Demo</span>}</div><p className="mt-1 text-sm text-[#667085] dark:text-muted-foreground">{clients.length} clientes • {clients.filter((client) => client.bought).length} compradores</p></div>
        <div className="flex shrink-0 gap-2">
          <Button size="icon" variant="outline" aria-label="Cadastrar cliente com IA" onClick={() => setCreateMode("ai")}><Bot className="h-4 w-4" /></Button>
          <Button className="bg-[#0B1220] px-3 text-white shadow-[0_8px_20px_rgba(11,18,32,0.14)] hover:bg-[#172033] sm:px-4" onClick={() => setCreateMode("manual")}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Novo cliente</span><span className="sm:hidden">Novo</span></Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CommercialMetric icon={UserRoundSearch} label="Clientes ativos" value={activeClients} active={cardFilterLabel === "Clientes ativos"} onClick={() => applyCardFilter("Clientes ativos", { insight: "active" })} />
        <CommercialMetric icon={CalendarClock} label="Follow-ups hoje" value={followUpsToday} attention={followUpsToday > 0} active={cardFilterLabel === "Follow-ups hoje"} onClick={() => applyCardFilter("Follow-ups hoje", { insight: "followups-today" })} />
        <CommercialMetric icon={CalendarPlus} label="Visitas agendadas" value={scheduledVisits} active={cardFilterLabel === "Visitas agendadas"} onClick={() => applyCardFilter("Visitas agendadas", { funnel: "visita agendada" })} />
        <CommercialMetric icon={CircleDollarSign} label="Negociações" value={negotiations} active={cardFilterLabel === "Negociações"} onClick={() => applyCardFilter("Negociações", { insight: "negotiations" })} />
      </section>

      <Card className="overflow-hidden border-0 shadow-[0_8px_30px_rgba(16,24,40,0.06)]">
        <CardHeader className="pb-3"><CardTitle className="text-lg">Precisa da minha atenção</CardTitle><CardDescription>Clientes com retorno ou decisão próxima.</CardDescription></CardHeader>
        <CardContent className="divide-y divide-[#EAECF0] p-0 dark:divide-border">
          {attentionClients.length ? attentionClients.map((client) => <AttentionRow key={client.id} client={client} now={now} onOpen={() => setSelectedCrmId(client.id)} />) : <div className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum cliente exige atenção imediata.</div>}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Buscar clientes" className="h-12 rounded-2xl border-[#EAECF0] bg-white pl-11 shadow-[0_1px_3px_rgba(16,24,40,0.04)] dark:border-border dark:bg-card" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedClientId(null); }} placeholder="Cliente, cidade, bairro, perfil, valor ou pagamento" />
          </div>
          <Button variant="outline" className="h-12 rounded-2xl border-[#EAECF0] bg-white px-4 dark:border-border dark:bg-card" onClick={() => setFiltersOpen(true)}><SlidersHorizontal className="h-4 w-4" /><span>Filtros</span>{activeFilterCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] text-primary-foreground">{activeFilterCount}</span>}</Button>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Funil comercial</h2><p className="text-sm text-[#667085] dark:text-muted-foreground">Selecione uma etapa e refine a carteira pelos filtros comerciais.</p></div>
        </div>
        <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle>Filtros do funil</DialogTitle><DialogDescription>Refine os clientes por localização, perfil, valor e forma de pagamento.</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <FilterSelect value={city} onValueChange={(value) => { setCity(value); setSelectedClientId(null); }} items={cities} placeholder="Cidade" />
              <FilterSelect value={profile} onValueChange={(value) => { setProfile(value); setSelectedClientId(null); }} items={profiles} placeholder="Perfil" />
              <FilterSelect value={stage} onValueChange={(value) => { setStage(value); setSelectedClientId(null); }} items={stages} placeholder="Etapa" />
              <FilterSelect value={paymentCondition} onValueChange={(value) => { setPaymentCondition(value); setSelectedClientId(null); }} items={paymentConditions} placeholder="Condição de pagamento" />
              <div className="space-y-2"><Label>Faixa de valor</Label><div className="grid grid-cols-2 gap-3"><Input aria-label="Valor mínimo" inputMode="numeric" type="number" min="0" value={budgetFrom} onChange={(event) => setBudgetFrom(event.target.value)} placeholder="Mínimo" /><Input aria-label="Valor máximo" inputMode="numeric" type="number" min="0" value={budgetTo} onChange={(event) => setBudgetTo(event.target.value)} placeholder="Máximo" /></div><p className="text-xs text-muted-foreground">Mostra clientes cuja faixa de compra cruza os valores informados.</p></div>
              <div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={clearClientFilters}>Limpar filtros</Button><Button onClick={() => setFiltersOpen(false)}>Ver {filtered.length} clientes</Button></div>
            </div>
          </DialogContent>
        </Dialog>
        <div className="client-map-strip -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <div className="flex w-max gap-2">
            {funnelStatuses.map((item) => {
              const count = item.value === "all" ? clients.length : clients.filter((client) => client.crmStatus === item.value).length;
              return <button key={item.value} type="button" onClick={() => setFunnelStage(item.value)} className={cn("inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#EAECF0] bg-white px-3.5 text-sm font-semibold text-[#475467] transition duration-200 hover:-translate-y-0.5 hover:border-[#98A2B3] dark:border-border dark:bg-card dark:text-muted-foreground", funnelStage === item.value && "border-[#0B1220] bg-[#0B1220] text-white shadow-[0_8px_20px_rgba(11,18,32,0.16)] hover:border-[#0B1220]")}><span>{item.label}</span><span className={cn("tabular-nums", funnelStage === item.value ? "text-white/65" : "text-[#98A2B3]")}>{count}</span></button>;
            })}
          </div>
        </div>
      </section>

      <section id="client-map-section" className="scroll-mt-24 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Carteira de clientes</h2><p className="text-sm text-[#667085] dark:text-muted-foreground">{visibleClients.length} cliente(s) encontrados</p></div>
          <div className="grid grid-cols-3 rounded-2xl bg-[#EAECF0]/70 p-1 dark:bg-muted" aria-label="Visualização dos clientes">
            {([['list', 'Lista', LayoutList], ['cards', 'Cards', Grid2X2], ['map', 'Mapa', Map]] as const).map(([value, label, Icon]) => <button key={value} type="button" aria-label={label} title={label} onClick={() => setClientView(value)} className={cn("grid h-10 w-10 place-items-center rounded-xl text-[#667085] transition sm:w-auto sm:grid-cols-[auto_auto] sm:gap-2 sm:px-3", clientView === value && "bg-white text-[#0B1220] shadow-sm dark:bg-card dark:text-foreground")}><Icon className="h-4 w-4" /><span className="hidden text-sm font-semibold sm:inline">{label}</span></button>)}
          </div>
        </div>
        {cardFilterLabel && <button type="button" onClick={clearClientFilters} className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#0B1220] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#172033] dark:bg-foreground dark:text-background"><span>Filtro: {cardFilterLabel}</span><X className="h-3.5 w-3.5" /></button>}

        {clientView === "map" && <Card className="min-w-0 overflow-hidden border-0 shadow-[0_8px_30px_rgba(16,24,40,0.06)]">
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><CardTitle>Mapa operacional</CardTitle><CardDescription>{mapLayer === "buildings" || mapLayer === "compatible" ? `${clientMapPoints.length} edifícios no mapa` : `${mapLayerClients.length} clientes com localização`}</CardDescription></div>
            <Button type="button" variant={routeMode ? "default" : "outline"} className="min-h-10 shrink-0" onClick={() => { setRouteMode((current) => !current); setSelectedClientId(null); setSelectedBuildingId(null); }}><Route className="h-4 w-4" />{routeMode ? "Selecionando rota" : "Planejar rota"}</Button>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="client-map-strip mb-3 flex gap-2 overflow-x-auto pb-2" aria-label="Camadas do mapa">
              {([['clients', 'Clientes', Users], ['nearby', 'Próximos', LocateFixed], ['visits', 'Visitas', CalendarPlus], ['sales', 'Vendas', Trophy], ['buildings', 'Edifícios', Building2], ['compatible', 'Compatíveis', Layers3]] as const).map(([value, label, Icon]) => <button key={value} type="button" aria-pressed={mapLayer === value} onClick={() => chooseMapLayer(value)} className={cn("inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition", mapLayer === value ? "border-[#0B1220] bg-[#0B1220] text-white dark:border-foreground dark:bg-foreground dark:text-background" : "border-[#EAECF0] bg-white text-[#475467] hover:bg-[#F7F8FA] dark:border-border dark:bg-card dark:text-muted-foreground")}><Icon className="h-4 w-4" />{label}</button>)}
            </div>
            <div className="client-map-strip mb-3 flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar marcações do mapa">
              {([
                ["todos", "Todos", Users, "text-foreground"],
                ["vendi", "Vendi", Trophy, "text-emerald-600 dark:text-emerald-400"],
                ["visitei", "Visitei", Check, "text-sky-600 dark:text-sky-400"],
                ["agendadas", "Agendadas", CalendarPlus, "text-amber-600 dark:text-amber-400"],
                ["sem-visita", "Sem visita", MapPin, "text-muted-foreground"]
              ] as const).map(([value, label, Icon, color]) => (
                <button key={value} type="button" aria-pressed={mapFilter === value} onClick={() => { setMapFilter(value); setMapLayer("clients"); setVisibleMapIds(null); setSelectedClientId(null); }} className={cn("inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-3 text-sm font-medium transition-colors", mapFilter === value ? "border-[#0B1220] bg-[#0B1220] text-white" : "border-[#EAECF0] bg-white text-[#475467] hover:bg-[#F7F8FA] dark:border-border dark:bg-card dark:text-muted-foreground")}>
                  <Icon className={cn("h-4 w-4", color)} />{label}<span className="text-xs tabular-nums text-muted-foreground">{filtered.filter((client) => matchesMapFilter(client, value)).length}</span>
                </button>
              ))}
            </div>
            {(marks.error || scheduled.error) && <p role="alert" className="mb-3 text-sm text-destructive">Não foi possível carregar as marcações. <button className="underline" onClick={() => window.location.reload()}>Tentar novamente</button></p>}
            <ClientMap
              clients={clientMapPoints}
              focusClientId={selectedClientId}
              onSelect={selectMapPoint}
              onVisibleChange={setVisibleMapIds}
              onLocationChange={setUserLocation}
              externalLocation={userLocation}
              routeMode={routeMode}
              routeIds={routeClientIds}
              onToggleRoute={toggleRouteClient}
              emptyMessage={mapLayer === "nearby" && !userLocation ? "Ative sua localização para ver clientes próximos." : "Nenhum ponto corresponde aos filtros desta camada."}
              overlay={<>
                {selectedClient && !mapDetailsOpen && <div className="absolute inset-x-3 bottom-3 z-[4] rounded-2xl border border-white/70 bg-white/95 p-3 shadow-[0_16px_40px_rgba(16,24,40,.24)] backdrop-blur dark:border-white/10 dark:bg-[#10151f]/95">
                  <div className="flex items-center gap-3"><span className="h-10 w-10 shrink-0"><ClientAvatar name={selectedClient.name} photo={selectedClient.photo} /></span><button type="button" className="min-w-0 flex-1 text-left" onClick={() => setMapDetailsOpen(true)}><span className="block truncate text-sm font-bold">{selectedClient.name}</span><span className="block truncate text-xs text-muted-foreground">{selectedClient.profile} • {selectedClient.city}</span></button><button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted" aria-label="Fechar ficha" onClick={() => setSelectedClientId(null)}><X className="h-4 w-4" /></button></div>
                  <div className="mt-2 flex items-center gap-2 overflow-x-auto text-xs"><span className="shrink-0 rounded-full bg-muted px-2.5 py-1 font-semibold">{nextActionFromMap(selectedClient)}</span><span className="shrink-0 rounded-full bg-muted px-2.5 py-1">{locationPrecisionLabel(selectedClient)}</span>{userLocation && selectedClient.lat !== undefined && selectedClient.lng !== undefined && <span className="shrink-0 rounded-full bg-muted px-2.5 py-1">{distanceKm(userLocation, { lat: selectedClient.lat, lng: selectedClient.lng }).toFixed(1).replace('.', ',')} km</span>}</div>
                  <div className="mt-3 grid grid-cols-3 gap-2">{selectedClient.whatsapp ? <a href={whatsappUrl(selectedClient.whatsapp, selectedClient.name)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border text-xs font-semibold"><MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">WhatsApp</span></a> : <Button variant="outline" disabled>Sem WhatsApp</Button>}<RouteButton label={selectedClient.name} address={`${selectedClient.neighborhood}, ${selectedClient.city}`} latitude={selectedClient.lat} longitude={selectedClient.lng} className="min-h-10 rounded-xl border text-xs font-semibold" /><Button type="button" className="min-h-10 text-xs" onClick={() => setMapDetailsOpen(true)}>Abrir cliente</Button></div>
                </div>}
                {selectedBuilding && <div className="absolute inset-x-3 bottom-3 z-[4] rounded-2xl border border-white/70 bg-white/95 p-3 shadow-[0_16px_40px_rgba(16,24,40,.24)] backdrop-blur dark:border-white/10 dark:bg-[#10151f]/95"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0B1220] text-white"><Building2 className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{selectedBuilding.name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{buildingAddress(selectedBuilding)}</p><p className="mt-2 text-xs font-medium text-[#667085] dark:text-muted-foreground">Localização do catálogo de edifícios</p></div><button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted" aria-label="Fechar edifício" onClick={() => setSelectedBuildingId(null)}><X className="h-4 w-4" /></button></div><RouteButton label={selectedBuilding.name} address={buildingAddress(selectedBuilding)} latitude={selectedBuilding.latitude} longitude={selectedBuilding.longitude} text="Ir agora" className="mt-3 min-h-10 w-full rounded-xl bg-[#0B1220] px-3 text-sm font-semibold text-white dark:bg-foreground dark:text-background" /></div>}
              </>}
            />
            {routeMode && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border bg-muted/50 p-3"><Route className="h-4 w-4" /><p className="mr-auto text-sm font-semibold">{routeClientIds.length ? `${routeClientIds.length} parada(s) selecionada(s)` : "Toque nos clientes para montar a rota"}</p><Button type="button" variant="ghost" size="sm" onClick={() => setRouteClientIds([])} disabled={!routeClientIds.length}>Limpar</Button><Button type="button" size="sm" onClick={openPlannedRoute} disabled={!routeClientIds.length}>Abrir rota</Button></div>}
            {!(mapLayer === "buildings" || mapLayer === "compatible") && synchronizedClients.length > 0 && <div className="mt-3"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Na área do mapa</p><span className="text-xs text-muted-foreground">{synchronizedClients.length} visíveis</span></div><div className="flex gap-2 overflow-x-auto pb-2">{synchronizedClients.map((client) => <button key={client.id} type="button" onClick={() => routeMode ? toggleRouteClient(client.id) : setSelectedClientId(client.id)} className={cn("flex min-w-[190px] items-center gap-2 rounded-xl border bg-card p-2 text-left transition", (selectedClientId === client.id || routeClientIds.includes(client.id)) && "border-[#0F8A65] ring-1 ring-[#0F8A65]")}><span className="h-8 w-8 shrink-0"><ClientAvatar name={client.name} photo={client.photo} /></span><span className="min-w-0"><span className="block truncate text-xs font-bold">{client.name}</span><span className="block truncate text-[11px] text-muted-foreground">{nextActionFromMap(client)}</span></span></button>)}</div></div>}
            {visibleClients.length > mappedClients.length && <p className="mt-3 text-sm text-muted-foreground">{visibleClients.length - mappedClients.length} cliente(s) sem localização conhecida na lista.</p>}
              <Dialog open={mapDetailsOpen && Boolean(selectedClient)} onOpenChange={(open) => { setMapDetailsOpen(open); if (!open) setClientView("map"); }}>
                {selectedClient && <DialogContent className="sm:max-w-md">
                  <DialogHeader><DialogTitle>{selectedClient.name}</DialogTitle><DialogDescription>{selectedClient.city} • {selectedClient.neighborhood}</DialogDescription></DialogHeader>
                  <p className="mb-3 text-xs text-muted-foreground">{selectedClient.locationPrecision === "city" ? "Localização aproximada: centro da cidade." : isDemo && !selectedClient.id.startsWith("sale-") ? "Localização demonstrativa." : ""}</p>
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
                    <RouteButton label={selectedClient.name} address={`${selectedClient.neighborhood}, ${selectedClient.city}`} latitude={selectedClient.lat} longitude={selectedClient.lng} text="Rota" className="min-h-11 rounded-lg border px-3 text-sm font-semibold" />
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
        </Card>}

        {clientView === "list" && <Card className="overflow-hidden border-0 shadow-[0_8px_30px_rgba(16,24,40,0.06)]"><CardContent className="divide-y divide-[#EAECF0] p-0 dark:divide-border"><ClientEmpty visible={visibleClients.length === 0} onClear={clearClientFilters} />{visibleClients.map((client) => <PremiumClientRow key={client.id} client={client} onOpen={() => openClient(client)} onMap={() => locateClientOnMap(client)} />)}</CardContent></Card>}
        {clientView === "cards" && <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3"><ClientEmpty visible={visibleClients.length === 0} onClear={clearClientFilters} />{visibleClients.map((client) => <PremiumClientCard key={client.id} client={client} editable onOpen={() => openClient(client)} onMap={() => locateClientOnMap(client)} onStatus={(status) => changeCardStatus(client, status)} onTemperature={(temperature) => changeCardTemperature(client, temperature)} />)}</div>}
      </section>

      <section className="space-y-4"><div><h2 className="text-lg font-semibold">Panorama da carteira</h2><p className="text-sm text-[#667085] dark:text-muted-foreground">Origem, conversão, perfil, localização e visitas.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {sourcePerformance.length ? sourcePerformance.slice(0, 4).map((item) => <AcquisitionCard key={item.label} {...item} active={cardFilterLabel === `Fonte: ${item.label}`} onClick={() => applyCardFilter(`Fonte: ${item.label}`, { source: item.label })} />) : <div className="col-span-full rounded-[20px] border border-dashed p-5 text-sm text-muted-foreground">Cadastre a fonte de captação dos clientes para acompanhar volume e conversão.</div>}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <ChampionCard icon={Crown} label="Perfil mais procurado" value={profileChampion?.label ?? "Dados insuficientes"} helper={`${profileChampion?.score ?? 0} interações`} active={cardFilterLabel === "Perfil mais procurado"} onClick={profileChampion ? () => applyCardFilter("Perfil mais procurado", { profile: profileChampion.label }) : undefined} />
        <ChampionCard icon={MapPin} label="Cidade campeã" value={cityChampion?.label ?? "Dados insuficientes"} helper={`${cityChampion?.score ?? 0} clientes`} active={cardFilterLabel === "Cidade campeã"} onClick={cityChampion ? () => applyCardFilter("Cidade campeã", { city: cityChampion.label }) : undefined} actionLabel="Ver todas as cidades" onAction={() => openCityExplorer()} />
        <ChampionCard icon={Trophy} label="Cidade que mais vendeu" value={citySalesChampion?.label ?? "Dados insuficientes"} helper={`${citySalesChampion?.score ?? 0} vendas`} active={cardFilterLabel === "Cidade que mais vendeu"} onClick={citySalesChampion ? () => applyCardFilter("Cidade que mais vendeu", { city: citySalesChampion.label, insight: "sales" }) : undefined} />
        <ChampionCard icon={Check} label="Visitas no mês" value={String(visitsThisMonth)} helper="visitas registradas" active={cardFilterLabel === "Visitas no mês"} onClick={() => applyCardFilter("Visitas no mês", { insight: "visited-month", view: "map", mapFilter: "visitei" })} />
        <ChampionCard icon={Route} label="Visitas no ano" value={String(visitsThisYear)} helper={`${now.getFullYear()} até agora`} active={cardFilterLabel === "Visitas no ano"} onClick={() => applyCardFilter("Visitas no ano", { insight: "visited-year", view: "map", mapFilter: "visitei" })} />
        <ChampionCard icon={Users} label="Clientes visitados" value={String(visitedClientIds.size)} helper="clientes únicos" active={cardFilterLabel === "Clientes visitados"} onClick={() => applyCardFilter("Clientes visitados", { insight: "visited", view: "map", mapFilter: "visitei" })} />
      </div></section>

      <Dialog open={citiesOpen} onOpenChange={setCitiesOpen}>
        <DialogContent className="max-h-[92dvh] overflow-hidden p-0 sm:max-w-2xl">
          <div className="border-b border-[#EAECF0] px-5 py-4 dark:border-border">
            <DialogHeader>
              <div className="flex items-center gap-3">
                {cityExplorer && <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => { setCityExplorer(null); setNeighborhoodExplorer(allValue); }} aria-label="Voltar para cidades"><ArrowLeft className="h-4 w-4" /></Button>}
                <div><DialogTitle>{cityExplorer ?? "Clientes por cidade"}</DialogTitle><DialogDescription>{cityExplorer ? `${cityExplorerClients.length} clientes nesta cidade` : `${cityGroups.length} cidades na carteira`}</DialogDescription></div>
              </div>
            </DialogHeader>
          </div>
          <div className="min-h-0 overflow-y-auto px-4 pb-5 pt-4 sm:px-5">
            {!cityExplorer ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {cityGroups.map((group) => <button key={group.city} type="button" onClick={() => { setCityExplorer(group.city); setNeighborhoodExplorer(allValue); }} className="flex min-h-20 items-center gap-3 rounded-2xl border border-[#EAECF0] bg-white p-3 text-left transition hover:border-[#98A2B3] hover:bg-[#F7F8FA] dark:border-border dark:bg-card dark:hover:bg-muted/50"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#0B1220] text-white"><Building2 className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{group.city}</span><span className="mt-1 block text-xs text-muted-foreground">{group.total} {group.total === 1 ? "cliente" : "clientes"} • {group.neighborhoods} {group.neighborhoods === 1 ? "bairro" : "bairros"}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></button>)}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="client-map-strip -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Filtrar clientes por bairro">
                  <NeighborhoodChip label="Todos" count={cityExplorerClients.length} active={neighborhoodExplorer === allValue} onClick={() => setNeighborhoodExplorer(allValue)} />
                  {cityNeighborhoods.map((name) => <NeighborhoodChip key={name} label={name} count={cityExplorerClients.filter((client) => client.neighborhood === name).length} active={neighborhoodExplorer === name} onClick={() => setNeighborhoodExplorer(name)} />)}
                </div>
                <div className="divide-y divide-[#EAECF0] overflow-hidden rounded-2xl border border-[#EAECF0] bg-white dark:divide-border dark:border-border dark:bg-card">
                  {neighborhoodClients.map((client) => <CityClientRow key={client.id} client={client} onOpen={() => { setCitiesOpen(false); void openClient(client); }} onMap={() => locateClientOnMap(client)} />)}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createMode !== null} onOpenChange={(open) => !open && setCreateMode(null)}><DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{createMode === "ai" ? "Cadastro com IA" : "Novo cliente"}</DialogTitle><DialogDescription>{createMode === "ai" ? "Envie a conversa e revise os dados encontrados." : "Informações para acompanhar a jornada de compra."}</DialogDescription></DialogHeader>{createMode === "ai" ? <AiClientIntake saving={crm.createClient.isPending} onSave={createCrmClient} /> : <ClientForm saving={crm.createClient.isPending} onSave={createCrmClient} />}</DialogContent></Dialog>
      <CompactClientDialog client={compactClient} open={Boolean(compactClient)} editable onOpenChange={(open) => !open && setCompactClientId(null)} onStatus={(status) => compactClient && changeCardStatus(compactClient, status)} onTemperature={(temperature) => compactClient && changeCardTemperature(compactClient, temperature)} onOpenFull={async () => { if (!compactClient) return; const registered = await ensureCrmClient(compactClient); if (registered) { setCompactClientId(null); setSelectedCrmId(registered.id); } }} />
      <ClientDetailDialog client={selectedCrmClient} open={Boolean(selectedCrmClient)} onOpenChange={(open) => !open && setSelectedCrmId(undefined)} onEdit={(client) => { setSelectedCrmId(undefined); setEditingClient(client); }} onStatus={changeCrmStatus} onFollowUp={changeFollowUp} onTemperature={changeTemperature} />
      <Dialog open={Boolean(editingClient)} onOpenChange={(open) => !open && setEditingClient(undefined)}>{editingClient && <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editingClient.name}</DialogTitle><DialogDescription>Atualize etapa, follow-up e informações do cliente.</DialogDescription></DialogHeader><ClientForm initial={editingClient} saving={crm.updateClient.isPending} onSave={editCrmClient} /></DialogContent>}</Dialog>
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
      <Dialog open={Boolean(saleClient)} onOpenChange={(open) => { if (!open) setSaleClient(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar venda</DialogTitle><DialogDescription>{saleClient?.name}. A data será usada no follow-up anual.</DialogDescription></DialogHeader>
          <form className="space-y-4" onSubmit={completeSale}><div className="space-y-2"><Label htmlFor="sale-date">Data da venda</Label><Input id="sale-date" name="sale_date" type="date" max={format(new Date(), "yyyy-MM-dd")} required /></div><Button className="w-full" disabled={crm.createClient.isPending || crm.updateClient.isPending}>Confirmar venda</Button></form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CommercialMetric({ icon: Icon, label, value, attention, active, onClick }: { icon: React.ElementType; label: string; value: number; attention?: boolean; active?: boolean; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={cn("min-w-0 rounded-[20px] bg-white p-4 text-left shadow-[0_6px_24px_rgba(16,24,40,0.05)] ring-1 ring-[#EAECF0]/80 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(16,24,40,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1220] dark:bg-card dark:ring-border", active && "ring-2 ring-[#0B1220] dark:ring-foreground") }>
    <div className="flex items-start justify-between gap-2"><p className="text-sm font-medium leading-5 text-[#667085] dark:text-muted-foreground">{label}</p><span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#F2F4F7] text-[#475467] dark:bg-muted dark:text-muted-foreground", attention && "bg-[#0F8A65]/10 text-[#0F8A65]")}><Icon className="h-4 w-4" /></span></div>
    <p className="mt-4 text-3xl font-semibold tabular-nums text-[#0B1220] dark:text-foreground">{value}</p>
  </button>;
}

function AttentionRow({ client, now, onOpen }: { client: Client; now: Date; onOpen: () => void }) {
  const phone = client.whatsapp || client.phone;
  return <article className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#F7F8FA] dark:hover:bg-muted/40 sm:px-5">
    <span className="h-11 w-11 shrink-0"><ClientAvatar name={client.name} /></span>
    <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen}>
      <span className="block truncate text-sm font-semibold text-[#0B1220] dark:text-foreground">{client.name}</span>
      <span className="mt-0.5 block truncate text-xs text-[#667085] dark:text-muted-foreground">{clientObjective(client)} • {budgetRange(client)}</span>
      <span className="mt-1 block truncate text-xs font-semibold text-[#8A6E42] dark:text-primary">{attentionReason(client, now)}</span>
    </button>
    <div className="flex shrink-0 gap-1">
      {client.whatsapp && <a href={whatsappUrl(client.whatsapp, client.name)} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-xl text-[#0F8A65] transition hover:bg-[#0F8A65]/10" aria-label={`WhatsApp de ${client.name}`}><MessageCircle className="h-4 w-4" /></a>}
      {phone && <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="grid h-10 w-10 place-items-center rounded-xl text-[#475467] transition hover:bg-[#F2F4F7] dark:text-muted-foreground dark:hover:bg-muted" aria-label={`Ligar para ${client.name}`}><Phone className="h-4 w-4" /></a>}
      <Button size="icon" variant="ghost" onClick={onOpen} aria-label={`Abrir ${client.name}`}><ExternalLink className="h-4 w-4" /></Button>
    </div>
  </article>;
}

function PremiumClientRow({ client, onOpen, onMap }: { client: ClientMapItem; onOpen: () => void; onMap: () => void }) {
  const phone = client.whatsapp || client.phone;
  return <article className="flex min-h-[64px] items-center gap-2.5 px-3 py-2.5 transition duration-200 hover:bg-[#F7F8FA] dark:hover:bg-muted/40 sm:px-4">
    <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
      <span className="h-9 w-9 shrink-0"><ClientAvatar name={client.name} photo={client.photo} /></span>
      <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-sm font-semibold text-[#0B1220] dark:text-foreground">{client.name}</span><TemperaturePill temperature={client.temperature} /></span><span className="mt-0.5 block truncate text-xs text-[#667085] dark:text-muted-foreground">{client.profile} • {client.city} • {client.source || "origem não informada"}</span></span>
    </button>
    <div className="flex shrink-0 items-center gap-1">
      <Button size="icon" variant="ghost" className="h-9 w-9" onClick={onMap} aria-label={`Ver ${client.name} no mapa`} title="Ver no mapa"><MapPin className="h-4 w-4" /></Button>
      <RouteButton label={client.name} address={`${client.neighborhood}, ${client.city}`} latitude={client.lat} longitude={client.lng} text="" className="h-9 w-9 rounded-xl text-primary hover:bg-primary/10" />
      {client.whatsapp && <a href={whatsappUrl(client.whatsapp, client.name)} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-xl text-[#0F8A65] hover:bg-[#0F8A65]/10" aria-label={`WhatsApp de ${client.name}`}><MessageCircle className="h-4 w-4" /></a>}
      {phone && <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="hidden h-9 w-9 place-items-center rounded-xl text-[#475467] hover:bg-[#F2F4F7] sm:grid dark:text-muted-foreground dark:hover:bg-muted" aria-label={`Ligar para ${client.name}`}><Phone className="h-4 w-4" /></a>}
      <Button size="icon" variant="ghost" className="h-9 w-9" onClick={onOpen} aria-label={`Abrir ${client.name}`}><ExternalLink className="h-4 w-4" /></Button>
    </div>
  </article>;
}

function PremiumClientCard({ client, editable, onOpen, onMap, onStatus, onTemperature }: { client: ClientMapItem; editable: boolean; onOpen: () => void; onMap: () => void; onStatus: (status: ClientStatus) => void; onTemperature: (temperature: ClientTemperature) => void }) {
  const phone = client.whatsapp || client.phone;
  return <article className="rounded-[22px] bg-white p-4 shadow-[0_8px_30px_rgba(16,24,40,0.055)] ring-1 ring-[#EAECF0]/80 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_34px_rgba(16,24,40,0.09)] dark:bg-card dark:ring-border">
    <div className="flex items-start gap-3"><span className="h-12 w-12 shrink-0"><ClientAvatar name={client.name} photo={client.photo} /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="truncate font-semibold text-[#0B1220] dark:text-foreground">{client.name}</h3><TemperaturePill temperature={client.temperature} /></div><p className="mt-1 truncate text-sm text-[#667085] dark:text-muted-foreground">{client.profile}</p><p className="truncate text-sm text-[#667085] dark:text-muted-foreground">{client.city}</p></div></div>
    <p className="mt-4 text-base font-semibold text-[#0B1220] dark:text-foreground">{budgetRangeFromMap(client)}</p>
    <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-[#F7F8FA] p-3 text-xs dark:bg-muted/55"><div><p className="text-[#98A2B3]">Fonte</p><p className="mt-1 truncate font-semibold text-[#475467] dark:text-foreground">{client.source || "Não informada"}</p></div><div><p className="text-[#98A2B3]">Pagamento</p><p className="mt-1 truncate font-semibold text-[#475467] dark:text-foreground">{client.paymentCondition || "Não informado"}</p></div><div className="col-span-2"><p className="text-[#98A2B3]">Próxima ação</p><p className="mt-1 truncate font-semibold text-[#475467] dark:text-foreground">{nextActionFromMap(client)}</p></div></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
      <Select value={client.crmStatus ?? mapStageToClientStatus(client.stage)} disabled={!editable} onValueChange={(value) => onStatus(value as ClientStatus)}><SelectTrigger className="h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger><SelectContent>{funnelStatuses.filter((item) => item.value !== "all").map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
      <TemperatureControl value={client.temperature} disabled={!editable} onChange={onTemperature} />
    </div>
    <div className="mt-3 grid grid-cols-[2.5rem_2.5rem_1fr_1fr_1fr] gap-2">
      <Button size="icon" variant="outline" className="h-10 w-10 rounded-xl" onClick={onMap} aria-label={`Ver ${client.name} no mapa`} title="Ver no mapa"><MapPin className="h-4 w-4" /></Button>
      <RouteButton label={client.name} address={`${client.neighborhood}, ${client.city}`} latitude={client.lat} longitude={client.lng} text="" className="h-10 w-10 rounded-xl border bg-background" />
      {client.whatsapp ? <a href={whatsappUrl(client.whatsapp, client.name)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#EAECF0] text-xs font-semibold text-[#0F8A65] hover:bg-[#0F8A65]/5 dark:border-border"><MessageCircle className="h-4 w-4" />WhatsApp</a> : <span className="min-h-10" />}
      {phone ? <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#EAECF0] text-xs font-semibold text-[#475467] hover:bg-[#F7F8FA] dark:border-border dark:text-muted-foreground"><Phone className="h-4 w-4" />Ligar</a> : <span className="min-h-10" />}
      <Button size="sm" variant="outline" className="min-h-10 px-2 text-xs" onClick={onOpen}>Abrir</Button>
    </div>
  </article>;
}

function TemperatureControl({ value, disabled, onChange }: { value?: ClientTemperature; disabled?: boolean; onChange: (temperature: ClientTemperature) => void }) {
  return <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#F2F4F7] p-1 dark:bg-muted" aria-label="Temperatura do cliente">
    {(["frio", "morno", "quente"] as ClientTemperature[]).map((temperature) => <button key={temperature} type="button" disabled={disabled} title={temperature} aria-label={temperature} aria-pressed={value === temperature} onClick={() => onChange(temperature)} className={cn("h-8 min-w-8 rounded-lg text-[0.62rem] font-semibold capitalize text-[#98A2B3] transition", value === temperature && temperatureTone(temperature), disabled && "cursor-not-allowed opacity-45")}>{temperature.slice(0, 1).toUpperCase()}</button>)}
  </div>;
}

function TemperaturePill({ temperature }: { temperature?: ClientTemperature }) {
  if (!temperature) return <span className="shrink-0 rounded-full bg-[#F2F4F7] px-2 py-1 text-[10px] font-semibold text-[#98A2B3] dark:bg-muted">sem temperatura</span>;
  return <span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold capitalize", temperatureTone(temperature))}><Thermometer className="mr-1 inline h-3 w-3" />{temperature}</span>;
}

function temperatureTone(temperature: ClientTemperature) {
  if (temperature === "quente") return "bg-red-500/10 text-red-600 dark:text-red-400";
  if (temperature === "morno") return "bg-amber-500/12 text-amber-700 dark:text-amber-400";
  return "bg-sky-500/10 text-sky-600 dark:text-sky-400";
}

function CompactClientDialog({ client, open, editable, onOpenChange, onStatus, onTemperature, onOpenFull }: { client?: ClientMapItem; open: boolean; editable: boolean; onOpenChange: (open: boolean) => void; onStatus: (status: ClientStatus) => void; onTemperature: (temperature: ClientTemperature) => void; onOpenFull: () => void }) {
  if (!client) return null;
  const phone = client.whatsapp || client.phone;
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader className="mb-3">
        <div className="flex items-center gap-3 pr-8"><span className="h-11 w-11 shrink-0"><ClientAvatar name={client.name} photo={client.photo} /></span><div className="min-w-0"><DialogTitle className="truncate text-lg">{client.name}</DialogTitle><DialogDescription className="mt-1 flex items-center gap-2"><span className="capitalize">{client.crmStatus ?? client.stage}</span><TemperaturePill temperature={client.temperature} /></DialogDescription></div></div>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <MapMini label="Interesse" value={client.profile} />
        <MapMini label="Localização" value={`${client.neighborhood}, ${client.city}`} />
        <MapMini label="Investimento" value={budgetRangeFromMap(client)} />
        <MapMini label="Fonte" value={client.source || "Não informada"} />
        <MapMini label="Pagamento" value={client.paymentCondition || "Não informado"} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Select value={client.crmStatus ?? mapStageToClientStatus(client.stage)} disabled={!editable} onValueChange={(value) => onStatus(value as ClientStatus)}><SelectTrigger className="h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger><SelectContent>{funnelStatuses.filter((item) => item.value !== "all").map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
        <TemperatureControl value={client.temperature} disabled={!editable} onChange={onTemperature} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {client.whatsapp ? <a href={whatsappUrl(client.whatsapp, client.name)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border text-xs font-semibold text-[#0F8A65]"><MessageCircle className="h-4 w-4" />WhatsApp</a> : <span />}
        {phone ? <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border text-xs font-semibold"><Phone className="h-4 w-4" />Ligar</a> : <span />}
        {editable ? <Button size="sm" variant="outline" className="min-h-10 text-xs" onClick={onOpenFull}>Ficha completa</Button> : <span />}
      </div>
    </DialogContent>
  </Dialog>;
}

function AcquisitionCard({ label, total, converted, conversion, active, onClick }: { label: string; total: number; converted: number; conversion: number; active?: boolean; onClick: () => void }) {
  return <Card className={cn("overflow-hidden border-0 shadow-[0_6px_24px_rgba(16,24,40,0.05)] ring-1 ring-[#EAECF0]/80 transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(16,24,40,0.09)] dark:ring-border", active && "ring-2 ring-[#0B1220] dark:ring-foreground")}>
    <button type="button" aria-pressed={active} onClick={onClick} className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0B1220]"><CardContent className="p-4">
      <div className="flex items-start justify-between gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0B1220] text-white"><Megaphone className="h-4 w-4" /></span><span className="rounded-full bg-[#0F8A65]/10 px-2 py-1 text-[10px] font-semibold text-[#0F8A65]">{conversion}% conversão</span></div>
      <p className="mt-4 truncate text-sm font-semibold">{label}</p>
      <div className="mt-2 flex items-end justify-between"><div><p className="text-2xl font-semibold tabular-nums">{total}</p><p className="text-xs text-muted-foreground">clientes captados</p></div><div className="text-right"><p className="font-semibold tabular-nums">{converted}</p><p className="text-xs text-muted-foreground">vendas</p></div></div>
    </CardContent></button>
  </Card>;
}

function ClientEmpty({ visible, onClear }: { visible: boolean; onClear: () => void }) {
  if (!visible) return null;
  return <div className="col-span-full grid min-h-44 place-items-center rounded-[22px] bg-white p-6 text-center shadow-[0_8px_30px_rgba(16,24,40,0.05)] dark:bg-card"><div><Users className="mx-auto h-6 w-6 text-[#98A2B3]" /><p className="mt-3 font-semibold">Nenhum cliente encontrado</p><Button className="mt-3" variant="outline" onClick={onClear}>Limpar filtros</Button></div></div>;
}

function attentionScore(client: Client, now: Date) {
  let score = ["proposta", "negociação"].includes(client.status) ? 30 : client.status === "visita agendada" ? 20 : 5;
  if (client.next_follow_up) {
    const days = Math.floor((new Date(`${client.next_follow_up}T12:00:00`).getTime() - now.getTime()) / 86400000);
    if (days < 0) score += 100 + Math.abs(days);
    else if (days === 0) score += 90;
    else if (days === 1) score += 50;
  }
  return score;
}

function attentionReason(client: Client, now: Date) {
  if (client.next_follow_up) {
    const days = Math.round((new Date(`${client.next_follow_up}T12:00:00`).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime()) / 86400000);
    if (days < 0) return `Follow-up atrasado há ${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"}`;
    if (days === 0) return "Retorno hoje";
    if (days === 1 && client.status === "visita agendada") return "Visita amanhã";
  }
  if (client.status === "proposta") return "Proposta aguardando resposta";
  if (client.status === "negociação") return "Negociação em andamento";
  if (client.status === "visita agendada") return "Visita agendada";
  return "Próxima ação pendente";
}

function clientObjective(client: Client) {
  return [client.bedrooms ? `${client.bedrooms} dorm` : null, client.city || client.property_profile].filter(Boolean).join(" • ") || "Perfil não informado";
}

function budgetRange(client: Client) {
  if (client.budget_min && client.budget_max) return `${formatCompactCurrency(client.budget_min)} – ${formatCompactCurrency(client.budget_max)}`;
  if (client.budget_max) return `Até ${formatCompactCurrency(client.budget_max)}`;
  if (client.budget_min) return `A partir de ${formatCompactCurrency(client.budget_min)}`;
  return "Faixa não informada";
}

function budgetRangeFromMap(client: ClientMapItem) {
  if (client.budgetMin && client.budgetMax) return `${formatCompactCurrency(client.budgetMin)} – ${formatCompactCurrency(client.budgetMax)}`;
  if (client.budgetMax) return `Até ${formatCompactCurrency(client.budgetMax)}`;
  if (client.budgetMin) return `A partir de ${formatCompactCurrency(client.budgetMin)}`;
  return client.bought ? "Venda realizada" : "Faixa não informada";
}

function formatCompactCurrency(value: number) {
  if (value >= 1000000) return `R$ ${(value / 1000000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return formatCurrency(value);
}

function nextActionFromMap(client: ClientMapItem) {
  if (client.nextFollowUp) return `Follow-up ${formatShortDate(client.nextFollowUp)}`;
  if (client.crmStatus === "proposta") return "Retornar proposta";
  if (client.crmStatus === "visita agendada") return "Preparar visita";
  return "Definir follow-up";
}

function formatShortDate(date: string) {
  const target = new Date(`${date}T12:00:00`);
  const today = new Date();
  const days = Math.round((target.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).getTime()) / 86400000);
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return target.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function withAnniversaryFollowUp(input: ClientInput): ClientInput {
  if (!input.sale_date || input.next_follow_up || !["venda realizada", "pós-venda"].includes(input.status ?? "")) return input;
  const sale = new Date(`${input.sale_date}T12:00:00`);
  const today = new Date();
  let anniversary = new Date(today.getFullYear(), sale.getMonth(), sale.getDate(), 12);
  if (anniversary <= today) anniversary = new Date(today.getFullYear() + 1, sale.getMonth(), sale.getDate(), 12);
  return { ...input, next_follow_up: anniversary.toISOString().slice(0, 10) };
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

function ChampionCard({ icon: Icon, label, value, helper, actionLabel, onAction, onClick, active }: { icon: React.ElementType; label: string; value: string; helper: string; actionLabel?: string; onAction?: () => void; onClick?: () => void; active?: boolean }) {
  return (
    <Card role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} aria-pressed={onClick ? active : undefined} onClick={onClick} onKeyDown={(event) => { if (onClick && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onClick(); } }} className={cn("overflow-hidden border-0 shadow-[0_6px_24px_rgba(16,24,40,0.05)] ring-1 ring-[#EAECF0]/80 transition dark:ring-border", onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(16,24,40,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1220]", active && "ring-2 ring-[#0B1220] dark:ring-foreground")}>
      <CardContent className="p-4">
        <Icon className="mb-4 h-5 w-5 text-[#B89A6A]" />
        <p className="text-xs text-[#667085] dark:text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-lg font-semibold text-[#0B1220] dark:text-foreground sm:text-xl">{value}</p>
        <p className="mt-1 text-xs text-[#98A2B3]">{helper}</p>
        {actionLabel && onAction && <button type="button" onClick={(event) => { event.stopPropagation(); onAction(); }} className="mt-4 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-[#0B1220] transition hover:text-[#B89A6A] dark:text-foreground"><span>{actionLabel}</span><ChevronRight className="h-3.5 w-3.5" /></button>}
      </CardContent>
    </Card>
  );
}

function mapUrgency(client: ClientMapItem, todayKey: string): "overdue" | "today" | "upcoming" | "normal" {
  if (!client.nextFollowUp) return client.stage === "visita agendada" ? "upcoming" : "normal";
  if (client.nextFollowUp < todayKey) return "overdue";
  if (client.nextFollowUp === todayKey) return "today";
  return "upcoming";
}

function locationPrecisionLabel(client: ClientMapItem) {
  return client.locationPrecision === "exact" ? "Localização exata" : "Localização aproximada";
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function distanceKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const radius = 6371;
  const latitude = (to.lat - from.lat) * Math.PI / 180;
  const longitude = (to.lng - from.lng) * Math.PI / 180;
  const a = Math.sin(latitude / 2) ** 2 + Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * Math.sin(longitude / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function NeighborhoodChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={cn("inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition", active ? "border-[#0B1220] bg-[#0B1220] text-white dark:border-foreground dark:bg-foreground dark:text-background" : "border-[#EAECF0] bg-white text-[#475467] hover:bg-[#F7F8FA] dark:border-border dark:bg-card dark:text-muted-foreground")}><span>{label}</span><span className={cn("text-xs tabular-nums", active ? "text-white/65 dark:text-background/65" : "text-[#98A2B3]")}>{count}</span></button>;
}

function CityClientRow({ client, onOpen, onMap }: { client: ClientMapItem; onOpen: () => void; onMap: () => void }) {
  return <article className="flex min-h-16 items-center gap-3 px-3 py-2.5 sm:px-4"><button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left"><span className="h-9 w-9 shrink-0"><ClientAvatar name={client.name} photo={client.photo} /></span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{client.name}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{client.neighborhood} • {client.profile}</span></span></button><Button type="button" size="icon" variant="ghost" className="h-10 w-10 shrink-0" onClick={onMap} aria-label={`Ver ${client.name} no mapa`} title="Ver no mapa"><MapPin className="h-4 w-4" /></Button></article>;
}

function groupClientsByCity(clients: ClientMapItem[]) {
  const groups = new globalThis.Map<string, { city: string; total: number; neighborhoods: Set<string> }>();
  clients.forEach((client) => {
    const current = groups.get(client.city) ?? { city: client.city, total: 0, neighborhoods: new Set<string>() };
    current.total += 1;
    if (client.neighborhood) current.neighborhoods.add(client.neighborhood);
    groups.set(client.city, current);
  });
  return Array.from(groups.values()).map((group) => ({ city: group.city, total: group.total, neighborhoods: group.neighborhoods.size })).sort((a, b) => b.total - a.total || a.city.localeCompare(b.city, "pt-BR"));
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

function acquisitionPerformance(clients: Client[]) {
  const groups = clients.reduce<Record<string, { total: number; converted: number }>>((acc, client) => {
    const label = client.source?.trim() || "Não informada";
    acc[label] ??= { total: 0, converted: 0 };
    acc[label].total += 1;
    if (["venda realizada", "pós-venda"].includes(client.status)) acc[label].converted += 1;
    return acc;
  }, {});
  return Object.entries(groups).map(([label, values]) => ({ label, ...values, conversion: values.total ? Math.round((values.converted / values.total) * 100) : 0 })).sort((a, b) => b.total - a.total || b.conversion - a.conversion);
}

function clientStatusToMapStage(status: import("@/types/database").ClientStatus): ClientStage {
  if (status === "venda realizada") return "comprador";
  if (status === "pós-venda") return "pós-venda";
  if (status === "visita agendada") return "visita agendada";
  if (status === "lead") return "lead";
  return "em contato";
}

function mapStageToClientStatus(stage: ClientStage): ClientStatus {
  if (stage === "comprador") return "venda realizada";
  if (stage === "pós-venda") return "pós-venda";
  if (stage === "visita agendada") return "visita agendada";
  if (stage === "lead") return "lead";
  return "em contato";
}

function coordinatesForCity(city: string) {
  const base = cityCoordinates[city.trim().toLowerCase()];
  return { lat: base?.lat, lng: base?.lng, locationPrecision: "city" as const };
}

function whatsappUrl(phone: string, name: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(`Olá, ${name}! Tudo bem?`)}`;
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

function nextSaleAnniversary(saleDate: string) {
  const sold = new Date(`${saleDate}T12:00:00`);
  const today = new Date();
  let next = new Date(today.getFullYear(), sold.getMonth(), sold.getDate(), 12);
  if (next <= today) next = new Date(today.getFullYear() + 1, sold.getMonth(), sold.getDate(), 12);
  return next.toISOString().slice(0, 10);
}
