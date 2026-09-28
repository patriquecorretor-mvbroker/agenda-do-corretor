import { useMemo, useState } from "react";
import { Building2, Copy, ExternalLink, MapPin, Navigation, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Building } from "@/types/database";
import { buildingAddress, useBuildings } from "./use-buildings";

const allNeighborhoods = "todos";

export function BuildingsPage() {
  const { buildings, isLoading, error } = useBuildings();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [neighborhood, setNeighborhood] = useState(allNeighborhoods);
  const [limit, setLimit] = useState(48);
  const [selected, setSelected] = useState<Building>();
  const neighborhoods = useMemo(() => Array.from(new Set(buildings.map((building) => building.neighborhood))).sort(), [buildings]);
  const filtered = useMemo(() => {
    const term = normalize(query);
    return buildings.filter((building) => {
      const matchesNeighborhood = neighborhood === allNeighborhoods || building.neighborhood === neighborhood;
      const matchesSearch = !term || normalize(`${building.name} ${building.street} ${building.number ?? ""} ${building.neighborhood} ${building.postalCode ?? ""}`).includes(term);
      return matchesNeighborhood && matchesSearch;
    });
  }, [buildings, neighborhood, query]);
  const visible = filtered.slice(0, limit);

  async function copyAddress(building: Building) {
    await navigator.clipboard.writeText(`${building.name} · ${buildingAddress(building)}${building.postalCode ? ` · CEP ${building.postalCode}` : ""}`);
    toast({ title: "Endereço copiado." });
  }

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-medium text-primary">Catálogo imobiliário</p><h1 className="mt-1 text-3xl font-semibold">Edifícios</h1><p className="mt-1 text-sm text-muted-foreground">{buildings.length} empreendimentos importados da base de localizações.</p></div>
      <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground"><Building2 className="h-4 w-4 text-primary" />Base atualizada</span>
    </header>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Summary label="Empreendimentos" value={buildings.length} />
      {neighborhoods.slice(0, 3).map((item) => <Summary key={item} label={item} value={buildings.filter((building) => building.neighborhood === item).length} />)}
    </section>

    <section className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
      <div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => { setQuery(event.target.value); setLimit(48); }} className="h-12 rounded-2xl bg-card pl-11" placeholder="Buscar edifício, rua, bairro ou CEP" /></div>
      <Select value={neighborhood} onValueChange={(value) => { setNeighborhood(value); setLimit(48); }}><SelectTrigger className="h-12 rounded-2xl bg-card"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={allNeighborhoods}>Todos os bairros</SelectItem>{neighborhoods.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
    </section>

    {error && <div role="alert" className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">Não foi possível carregar o catálogo do banco. A base importada permanece disponível neste dispositivo.</div>}
    {isLoading && !buildings.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-2xl bg-muted" />)}</div> : null}

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {visible.map((building) => <BuildingCard key={building.id} building={building} onOpen={() => setSelected(building)} />)}
    </section>
    {!visible.length && <div className="rounded-2xl border bg-card px-5 py-14 text-center"><Building2 className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 font-semibold">Nenhum edifício encontrado</p><Button variant="outline" className="mt-4" onClick={() => { setQuery(""); setNeighborhood(allNeighborhoods); }}>Limpar busca</Button></div>}
    {visible.length < filtered.length && <div className="flex justify-center"><Button variant="outline" onClick={() => setLimit((current) => current + 48)}>Mostrar mais {Math.min(48, filtered.length - visible.length)}</Button></div>}

    <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(undefined)}>
      {selected && <DialogContent className="sm:max-w-lg">
        <div className={cn("-mx-6 -mt-6 mb-5 flex h-40 items-end overflow-hidden rounded-t-lg p-5 text-white", coverTone(selected.neighborhood))}><div><p className="text-xs font-semibold uppercase text-white/60">{selected.neighborhood}</p><DialogTitle className="mt-1 text-2xl text-white">{selected.name}</DialogTitle></div></div>
        <DialogHeader><DialogDescription className="sr-only">Detalhes e localização do edifício.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <Detail icon={MapPin} label="Endereço" value={buildingAddress(selected)} />
          <Detail icon={Navigation} label="CEP" value={selected.postalCode ?? "Não informado"} />
          <p className="text-xs text-muted-foreground">Coordenadas: {selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3"><Button variant="outline" onClick={() => copyAddress(selected)}><Copy className="h-4 w-4" />Copiar</Button><Button asChild><a href={selected.mapsUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Abrir mapa</a></Button></div>
      </DialogContent>}
    </Dialog>
  </div>;
}

function BuildingCard({ building, onOpen }: { building: Building; onOpen: () => void }) {
  return <Card className="group overflow-hidden border-0 shadow-[0_8px_28px_rgba(15,23,42,0.07)] ring-1 ring-border/70 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(15,23,42,0.12)]">
    <button type="button" onClick={onOpen} className="w-full text-left">
      <div className={cn("relative flex h-32 items-end overflow-hidden p-4 text-white", coverTone(building.neighborhood))}><Building2 className="absolute right-4 top-4 h-9 w-9 text-white/18" /><span className="rounded-full border border-white/15 bg-black/15 px-2.5 py-1 text-xs font-semibold backdrop-blur">{building.neighborhood}</span></div>
      <CardContent className="p-4"><h2 className="truncate text-base font-semibold">{building.name}</h2><p className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><span className="line-clamp-2">{buildingAddress(building)}</span></p><div className="mt-4 flex items-center justify-between gap-3 border-t pt-3 text-xs"><span className="text-muted-foreground">{building.postalCode ? `CEP ${building.postalCode}` : "CEP não informado"}</span><span className="font-semibold text-primary">Ver detalhes</span></div></CardContent>
    </button>
  </Card>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border bg-card p-4 shadow-sm"><p className="text-xs font-medium uppercase text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>;
}

function Detail({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return <div className="flex items-start gap-3 rounded-xl bg-muted/55 p-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 text-sm font-semibold">{value}</p></div></div>;
}

function coverTone(neighborhood: string) {
  if (normalize(neighborhood).includes("navegantes")) return "bg-[linear-gradient(135deg,#082F49,#0E7490)]";
  if (normalize(neighborhood).includes("zona nova")) return "bg-[linear-gradient(135deg,#12382B,#2E7D59)]";
  return "bg-[linear-gradient(135deg,#111827,#4B5563)]";
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}
