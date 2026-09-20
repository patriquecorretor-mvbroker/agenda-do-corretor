import { useEffect, useMemo, useState } from "react";
import { Crown, MapPin, Plus, Search, Trophy, Users } from "lucide-react";
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
};

const demoClients: ClientMapItem[] = [
  { id: "1", name: "Mariana Alves", city: "São Paulo", neighborhood: "Mooca", profile: "Apartamento 2 quartos", stage: "visita agendada", bought: false, downloads: 9, x: 58, y: 50 },
  { id: "2", name: "Carlos Mendes", city: "São Paulo", neighborhood: "Tatuapé", profile: "Apartamento 2 quartos", stage: "comprador", bought: true, downloads: 12, x: 64, y: 44 },
  { id: "3", name: "Renata Lima", city: "Guarulhos", neighborhood: "Centro", profile: "Casa em condomínio", stage: "em contato", bought: false, downloads: 5, x: 70, y: 31 },
  { id: "4", name: "Felipe Rocha", city: "Santo André", neighborhood: "Campestre", profile: "Studio", stage: "lead", bought: false, downloads: 4, x: 62, y: 67 },
  { id: "5", name: "Aline Souza", city: "São Bernardo", neighborhood: "Jardim do Mar", profile: "Apartamento 3 quartos", stage: "comprador", bought: true, downloads: 8, x: 52, y: 75 },
  { id: "6", name: "Bruno Costa", city: "Osasco", neighborhood: "Centro", profile: "Apartamento 2 quartos", stage: "pós-venda", bought: true, downloads: 7, x: 34, y: 50 },
  { id: "7", name: "Patrícia Gomes", city: "Barueri", neighborhood: "Alphaville", profile: "Casa em condomínio", stage: "em contato", bought: false, downloads: 11, x: 25, y: 42 },
  { id: "8", name: "Eduardo Nunes", city: "Campinas", neighborhood: "Cambuí", profile: "Apartamento alto padrão", stage: "lead", bought: false, downloads: 6, x: 18, y: 28 },
  { id: "9", name: "Bianca Reis", city: "Sorocaba", neighborhood: "Campolim", profile: "Casa em condomínio", stage: "visita agendada", bought: false, downloads: 10, x: 23, y: 78 },
  { id: "10", name: "Rafael Martins", city: "Santos", neighborhood: "Ponta da Praia", profile: "Apartamento vista mar", stage: "comprador", bought: true, downloads: 14, x: 76, y: 84 }
];

const allValue = "todos";
const clientStorageKey = "mv-broker-clients";

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

  useEffect(() => {
    localStorage.setItem(clientStorageKey, JSON.stringify(customClients));
  }, [customClients]);

  const financeClients = finance.commissions
    .filter((commission) => commission.client)
    .map((commission, index) => ({
      id: `sale-${commission.id}`,
      name: commission.client ?? "Cliente",
      city: "Carteira",
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

  function addClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const nextCity = String(form.get("city") || "").trim();
    const nextProfile = String(form.get("profile") || "").trim();
    if (!name || !nextCity || !nextProfile) return;
    const index = customClients.length + demoClients.length;
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
      y: 24 + (index * 17) % 58
    };
    setCustomClients((current) => [...current, next]);
    setCity(nextCity);
    toast({ title: "Cliente cadastrado no mapa." });
    event.currentTarget.reset();
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
          <CardHeader>
            <CardTitle>Mapa de clientes</CardTitle>
            <CardDescription>Mapa visual preparado para integração com geolocalização real.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative min-h-[360px] overflow-hidden rounded-[1.75rem] border bg-[radial-gradient(circle_at_20%_25%,_hsl(var(--primary)/0.18),_transparent_18%),radial-gradient(circle_at_75%_70%,_hsl(var(--primary)/0.14),_transparent_22%),linear-gradient(135deg,_hsl(var(--muted)),_hsl(var(--card)))] p-4">
              <div className="absolute inset-x-8 top-1/2 h-px bg-border/70" />
              <div className="absolute inset-y-8 left-1/2 w-px bg-border/70" />
              <div className="absolute left-6 top-6 rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">Região de atuação</div>
              {filtered.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  className="absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary p-2 text-primary-foreground shadow-[0_12px_30px_hsl(var(--primary)/0.30)] transition hover:scale-110"
                  style={{ left: `${client.x}%`, top: `${client.y}%` }}
                  title={`${client.name} - ${client.city}`}
                >
                  <MapPin className="h-4 w-4" />
                </button>
              ))}
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
                  <Mini label="Downloads" value={client.downloads} />
                </div>
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
