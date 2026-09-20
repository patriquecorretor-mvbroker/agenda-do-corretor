import { useEffect, useMemo, useState } from "react";
import { Check, Crown, ExternalLink, LocateFixed, MapPin, Navigation, Plus, Search, Trophy, Users } from "lucide-react";
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
  const [visitLog, setVisitLog] = useState<Array<{ clientId: string; date: string }>>(() => {
    try {
      return JSON.parse(localStorage.getItem(visitStorageKey) ?? "[]") as Array<{ clientId: string; date: string }>;
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(clientStorageKey, JSON.stringify(customClients));
  }, [customClients]);

  useEffect(() => {
    localStorage.setItem(visitStorageKey, JSON.stringify(visitLog));
  }, [visitLog]);

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

  const clients = [...demoClients, ...financeClients, ...customClients];
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
  const mappedClients = positionClients(filtered);
  const selectedClient = mappedClients.find((client) => client.id === selectedClientId) ?? mappedClients[0];
  const now = new Date();
  const visitsThisMonth = visitLog.filter((visit) => isSameMonthKey(visit.date, now)).length;
  const visitsThisYear = visitLog.filter((visit) => new Date(visit.date).getFullYear() === now.getFullYear()).length;
  const visitedClientIds = new Set(visitLog.map((visit) => visit.clientId));
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
    setSelectedClientId(next.id);
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

  function markVisit(client: ClientMapItem) {
    const date = new Date().toISOString();
    setVisitLog((current) => [...current, { clientId: client.id, date }]);
    toast({ title: `Visita ao cliente ${client.name} marcada no mapa.` });
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.34),_transparent_36%),linear-gradient(135deg,_#050403,_#15100b_58%,_#050403)] p-4 text-white shadow-soft md:rounded-[2rem] md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Users className="h-3.5 w-3.5" />
              Carteira de clientes
            </div>
            <h1 className="text-2xl font-semibold md:text-5xl">Clientes no mapa e na carteira.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
              Visualize onde estão os clientes, quais perfis atraem mais interesse e quais cidades geram mais vendas.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <HeroStat label="Clientes" value={clients.length} />
            <HeroStat label="Em contato" value={clients.filter((client) => client.stage === "em contato").length} />
            <HeroStat label="Compradores" value={clients.filter((client) => client.bought).length} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <ChampionCard icon={Crown} label="Perfil mais baixado" value={profileChampion?.label ?? "Dados insuficientes"} helper={`${profileChampion?.score ?? 0} interações`} />
        <ChampionCard icon={MapPin} label="Cidade campeã" value={cityChampion?.label ?? "Dados insuficientes"} helper={`${cityChampion?.score ?? 0} clientes`} />
        <ChampionCard icon={Trophy} label="Cidade que mais vendeu" value={citySalesChampion?.label ?? "Dados insuficientes"} helper={`${citySalesChampion?.score ?? 0} vendas`} />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <ChampionCard icon={Check} label="Visitas feitas no mês" value={String(visitsThisMonth)} helper="clientes marcados como visitados" />
        <ChampionCard icon={Navigation} label="Visitas no ano" value={String(visitsThisYear)} helper={`${now.getFullYear()} até agora`} />
        <ChampionCard icon={Users} label="Clientes já visitados" value={String(visitedClientIds.size)} helper="clientes únicos com check" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Filtros da carteira</CardTitle>
          <CardDescription>Filtre por perfil de imóvel, cidade, etapa ou busca livre.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-11" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, bairro, imóvel..." />
          </div>
          <FilterSelect value={city} onValueChange={setCity} items={cities} placeholder="Cidade" />
          <FilterSelect value={profile} onValueChange={setProfile} items={profiles} placeholder="Perfil" />
          <FilterSelect value={stage} onValueChange={setStage} items={stages} placeholder="Etapa" />
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-primary/20">
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

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Mapa de clientes</CardTitle>
              <CardDescription>Pontos por coordenada, localização atual e rota rápida.</CardDescription>
            </div>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={locateMe}>
              <LocateFixed className="h-4 w-4" />
              Minha localização
            </Button>
          </CardHeader>
          <CardContent>
            <div className="relative min-h-[430px] overflow-hidden rounded-[1.75rem] border bg-[radial-gradient(circle_at_18%_20%,_rgba(218,165,57,0.20),_transparent_18%),radial-gradient(circle_at_78%_76%,_rgba(255,255,255,0.12),_transparent_24%),linear-gradient(135deg,_#070604,_#17110b_48%,_#030201)] p-4 text-white">
              <div className="absolute inset-x-8 top-1/2 h-px bg-white/10" />
              <div className="absolute inset-y-8 left-1/2 w-px bg-white/10" />
              <div className="absolute left-[12%] top-[28%] h-24 w-48 rotate-[-18deg] rounded-full border border-primary/20" />
              <div className="absolute bottom-[18%] right-[12%] h-28 w-56 rotate-[22deg] rounded-full border border-white/10" />
              <div className="absolute left-6 top-6 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/70 backdrop-blur">
                {mappedClients.length} clientes mapeados
              </div>
              {currentLocation && (
                <div className="absolute left-1/2 top-1/2 z-10 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-sky-500 shadow-[0_0_0_8px_rgba(14,165,233,0.18)]" title="Sua localização">
                  <Navigation className="h-4 w-4" />
                </div>
              )}
              {mappedClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClientId(client.id)}
                  className={cn(
                    "absolute z-20 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full p-2 text-primary-foreground shadow-[0_12px_30px_rgba(218,165,57,0.30)] transition hover:scale-110",
                    selectedClient?.id === client.id ? "bg-white text-[#17120b] ring-4 ring-primary/40" : "bg-primary"
                  )}
                  style={{ left: `${client.x}%`, top: `${client.y}%` }}
                  title={`${client.name} - ${client.city}`}
                >
                  {visitedClientIds.has(client.id) ? <Check className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                </button>
              ))}
              {selectedClient && (
                <div className="absolute inset-x-4 bottom-4 z-30 rounded-3xl border border-white/10 bg-black/58 p-4 text-white shadow-2xl backdrop-blur md:left-auto md:w-[330px]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{selectedClient.name}</p>
                      <p className="truncate text-sm text-white/62">{selectedClient.city} • {selectedClient.neighborhood}</p>
                    </div>
                    <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-1 text-[0.68rem] font-semibold text-primary">{selectedClient.stage}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <MapMini label="Perfil" value={selectedClient.profile} />
                    <MapMini label="Visitas feitas" value={selectedClientVisits.length} />
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Button type="button" className="min-h-10" onClick={() => markVisit(selectedClient)}>
                      <Check className="h-4 w-4" />
                      {selectedVisitedToday ? "Visitado hoje" : "Marcar visita"}
                    </Button>
                    <a
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.08] px-4 text-sm font-semibold text-white"
                      href={mapsUrl(selectedClient)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Rota
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  {selectedClientVisits[0] && (
                    <p className="mt-2 text-xs text-white/52">Última visita: {formatVisitDate(selectedClientVisits[selectedClientVisits.length - 1].date)}</p>
                  )}
                </div>
              )}
            </div>
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
                <Button className="mt-3 w-full" variant="outline" size="sm" onClick={() => markVisit(client)}>
                  <Check className="h-4 w-4" />
                  Marcar visita feita
                </Button>
              </article>
            ))}
          </CardContent>
        </Card>
      </div>
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
        <SelectItem value={allValue}>Todos</SelectItem>
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-2.5">
      <p className="text-[0.68rem] text-white/45">{label}</p>
      <p className="mt-1 truncate font-semibold">{value}</p>
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
