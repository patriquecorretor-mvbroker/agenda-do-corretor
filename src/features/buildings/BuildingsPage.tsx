import { useMemo, useState } from "react";
import { ArrowLeft, Building2, CalendarDays, CheckCircle2, Copy, ExternalLink, Image as ImageIcon, MapPin, Navigation, Pencil, Plus, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RouteButton } from "@/components/RouteButton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Building } from "@/types/database";
import { BuildingFormDialog } from "./BuildingFormDialog";
import { buildingAddress, newBuilding, useBuildings } from "./use-buildings";

const allNeighborhoods = "todos";
type CatalogFilter = "todos" | "com-foto" | "dados-publicos" | "pendente";

export function BuildingsPage() {
  const { buildings, isLoading, error, saveBuilding } = useBuildings();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [neighborhood, setNeighborhood] = useState(allNeighborhoods);
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>("todos");
  const [limit, setLimit] = useState(48);
  const [selected, setSelected] = useState<Building>();
  const [editing, setEditing] = useState<Building>();
  const neighborhoods = useMemo(() => Array.from(new Set(buildings.map((building) => building.neighborhood))).sort(), [buildings]);
  const filtered = useMemo(() => {
    const term = normalize(query);
    return buildings.filter((building) => {
      const matchesNeighborhood = neighborhood === allNeighborhoods || building.neighborhood === neighborhood;
      const matchesSearch = !term || normalize(`${building.name} ${building.street} ${building.number ?? ""} ${building.neighborhood} ${building.postalCode ?? ""} ${building.builder ?? ""} ${building.developer ?? ""}`).includes(term);
      const matchesCatalog = catalogFilter === "todos" || (catalogFilter === "com-foto" && Boolean(building.coverUrl)) || (catalogFilter === "dados-publicos" && ["web", "verificado"].includes(building.verificationStatus ?? "")) || (catalogFilter === "pendente" && building.verificationStatus === "pendente");
      return matchesNeighborhood && matchesSearch && matchesCatalog;
    });
  }, [buildings, catalogFilter, neighborhood, query]);
  const visible = filtered.slice(0, limit);

  async function copyAddress(building: Building) {
    await navigator.clipboard.writeText(`${building.name} · ${buildingAddress(building)}${building.postalCode ? ` · CEP ${building.postalCode}` : ""}`);
    toast({ title: "Endereço copiado." });
  }

  async function save(building: Building) {
    try {
      await saveBuilding(building);
      setSelected(undefined);
      toast({ title: "Edifício salvo e disponível no catálogo." });
    } catch {
      toast({ title: "Salvo neste dispositivo; sincronização pendente." });
    }
  }

  const withPhoto = buildings.filter((building) => building.coverUrl).length;
  const publicData = buildings.filter((building) => ["web", "verificado"].includes(building.verificationStatus ?? "")).length;
  const pending = buildings.filter((building) => building.verificationStatus === "pendente").length;

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-medium text-primary">Inteligência imobiliária</p><h1 className="mt-1 text-3xl font-semibold">Edifícios</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Catálogo vivo com localização, ficha técnica, infraestrutura e construtora.</p></div>
      <Button className="h-11 w-full sm:w-auto" onClick={() => setEditing(newBuilding())}><Plus className="h-4 w-4" />Novo edifício</Button>
    </header>

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Summary label="Empreendimentos" value={buildings.length} active={catalogFilter === "todos"} onClick={() => setCatalogFilter("todos")} />
      <Summary label="Com fachada" value={withPhoto} active={catalogFilter === "com-foto"} icon={ImageIcon} onClick={() => setCatalogFilter("com-foto")} />
      <Summary label="Dados públicos" value={publicData} active={catalogFilter === "dados-publicos"} icon={ShieldCheck} onClick={() => setCatalogFilter("dados-publicos")} />
      <Summary label="A completar" value={pending} active={catalogFilter === "pendente"} icon={CalendarDays} onClick={() => setCatalogFilter("pendente")} />
    </section>

    <section className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
      <div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => { setQuery(event.target.value); setLimit(48); }} className="h-12 rounded-2xl bg-card pl-11" placeholder="Buscar edifício, rua, bairro ou construtora" /></div>
      <Select value={neighborhood} onValueChange={(value) => { setNeighborhood(value); setLimit(48); }}><SelectTrigger className="h-12 rounded-2xl bg-card"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={allNeighborhoods}>Todos os bairros</SelectItem>{neighborhoods.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
    </section>

    {error && <div role="alert" className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">Não foi possível carregar o catálogo do banco. A base local permanece disponível neste dispositivo.</div>}
    {isLoading && !buildings.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-2xl bg-muted" />)}</div> : null}

    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {visible.map((building) => <BuildingCard key={building.id} building={building} onOpen={() => setSelected(building)} />)}
    </section>
    {!visible.length && <div className="rounded-2xl border bg-card px-5 py-14 text-center"><Building2 className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 font-semibold">Nenhum edifício encontrado</p><Button variant="outline" className="mt-4" onClick={() => { setQuery(""); setNeighborhood(allNeighborhoods); setCatalogFilter("todos"); }}>Limpar busca</Button></div>}
    {visible.length < filtered.length && <div className="flex justify-center"><Button variant="outline" onClick={() => setLimit((current) => current + 48)}>Mostrar mais {Math.min(48, filtered.length - visible.length)}</Button></div>}

    <BuildingDetails building={selected} onClose={() => setSelected(undefined)} onCopy={copyAddress} onEdit={(building) => { setSelected(undefined); setEditing(building); }} />
    {editing && <BuildingFormDialog open building={editing} onOpenChange={(open) => !open && setEditing(undefined)} onSave={save} />}
  </div>;
}

function BuildingCard({ building, onOpen }: { building: Building; onOpen: () => void }) {
  const completeness = buildingCompleteness(building);
  return <Card className="group relative overflow-hidden border-0 shadow-[0_8px_28px_rgba(15,23,42,0.07)] ring-1 ring-border/70 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(15,23,42,0.12)]">
    <RouteButton label={building.name} address={buildingAddress(building)} latitude={building.latitude} longitude={building.longitude} text="" className="absolute right-3 top-3 z-10 h-10 w-10 rounded-xl border border-white/25 bg-black/65 text-white shadow-lg backdrop-blur transition hover:bg-primary hover:text-primary-foreground" />
    <button type="button" onClick={onOpen} className="w-full text-left">
      <BuildingCover building={building} compact />
      <CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-base font-semibold">{building.name}</h2><p className="mt-1 truncate text-xs text-muted-foreground">{building.builder || "Construtora não informada"}</p></div><VerificationBadge status={building.verificationStatus} /></div><p className="mt-3 flex items-start gap-1.5 text-sm leading-5 text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><span className="line-clamp-2">{buildingAddress(building)}</span></p><div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-center text-xs"><MiniMetric label="Unidades" value={building.totalUnits} /><MiniMetric label="Elevadores" value={building.elevators} /><MiniMetric label="Entrega" value={building.deliveryYear} /></div><div className="mt-3 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completeness}%` }} /></div><span className="text-[10px] font-semibold tabular-nums text-muted-foreground">Ficha {completeness}%</span></div></CardContent>
    </button>
  </Card>;
}

function BuildingDetails({ building, onClose, onCopy, onEdit }: { building?: Building; onClose: () => void; onCopy: (building: Building) => void; onEdit: (building: Building) => void }) {
  return <Dialog open={Boolean(building)} onOpenChange={(open) => !open && onClose()}>{building && <DialogContent className="sm:max-w-3xl">
    <Button type="button" variant="outline" size="sm" onClick={onClose} className="absolute left-4 top-4 z-20 border-white/25 bg-black/55 text-white shadow-lg backdrop-blur hover:bg-black/75 hover:text-white"><ArrowLeft className="h-4 w-4" />Voltar</Button>
    <div className="-mx-5 -mt-5 mb-5 sm:-mx-5 sm:-mt-5"><BuildingCover building={building} /></div>
    <DialogHeader><div className="flex items-start justify-between gap-4 pr-8"><div><DialogTitle className="text-2xl">{building.name}</DialogTitle><DialogDescription className="mt-1">{buildingAddress(building)} · {building.city ?? "Capão da Canoa"}/{building.state ?? "RS"}</DialogDescription></div><VerificationBadge status={building.verificationStatus} /></div></DialogHeader>
    {building.description && <p className="text-sm leading-6 text-muted-foreground">{building.description}</p>}
    <CompletenessPanel building={building} />

    <section className="mt-5"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Ficha técnica</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="Construtora" value={building.builder} wide /><Metric label="Ano da construção" value={building.constructionYear} /><Metric label="Ano de entrega" value={building.deliveryYear} /><Metric label="Torres" value={building.towers} /><Metric label="Andares" value={building.floors} /><Metric label="Unidades" value={building.totalUnits} /><Metric label="Unid. por andar" value={building.unitsPerFloor} /><Metric label="Elevadores" value={building.elevators} /></div></section>
    <section className="mt-5"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Apartamentos</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><Metric label="Dormitórios" value={formatRange(building.bedroomsMin, building.bedroomsMax)} /><Metric label="Área privativa" value={formatAreaRange(building.privateAreaMin, building.privateAreaMax)} /><Metric label="Vagas" value={building.parkingSpaces} /></div></section>
    {Boolean(building.amenities?.length) && <section className="mt-5"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Infraestrutura</p><div className="flex flex-wrap gap-2">{building.amenities!.map((item) => <span key={item} className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">{item}</span>)}</div></section>}
    <section className="mt-5 grid gap-2 sm:grid-cols-2"><Detail icon={MapPin} label="Endereço" value={`${buildingAddress(building)}${building.postalCode ? ` · CEP ${building.postalCode}` : ""}`} /><Detail icon={Navigation} label="Coordenadas" value={`${building.latitude.toFixed(6)}, ${building.longitude.toFixed(6)}`} /></section>
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><Button variant="outline" onClick={() => onCopy(building)}><Copy className="h-4 w-4" />Copiar</Button><Button variant="outline" onClick={() => onEdit(building)}><Pencil className="h-4 w-4" />Editar</Button><RouteButton label={building.name} address={buildingAddress(building)} latitude={building.latitude} longitude={building.longitude} text="Ir agora" className="min-h-10 rounded-xl border bg-background px-4 text-sm font-medium hover:bg-muted" />{building.websiteUrl ? <Button asChild><a href={building.websiteUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Site</a></Button> : <Button disabled><ExternalLink className="h-4 w-4" />Site</Button>}</div>
  </DialogContent>}</Dialog>;
}

function BuildingCover({ building, compact = false }: { building: Building; compact?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(building.coverUrl) && !imageFailed;
  return <div className={cn("relative flex items-end overflow-hidden text-white", compact ? "h-36 p-4" : "h-52 rounded-t-[2rem] p-5 sm:h-64", !showImage && coverTone(building.neighborhood))}>{showImage ? <img src={building.coverUrl!} alt={`Fachada do ${building.name}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" /> : <Building2 className="absolute right-5 top-5 h-12 w-12 text-white/18" />}<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" /><span className="relative rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-xs font-semibold backdrop-blur">{building.neighborhood}</span></div>;
}

function Summary({ label, value, active, icon: Icon = Building2, onClick }: { label: string; value: number; active: boolean; icon?: React.ElementType; onClick: () => void }) { return <button type="button" onClick={onClick} className={cn("rounded-2xl border p-4 text-left shadow-sm transition", active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/35")}><div className="flex items-center justify-between gap-2"><p className={cn("text-xs font-medium uppercase", active ? "text-primary-foreground/70" : "text-muted-foreground")}>{label}</p><Icon className="h-4 w-4" /></div><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></button>; }
function VerificationBadge({ status }: { status?: Building["verificationStatus"] }) { const verified = status === "verificado"; const web = status === "web"; return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase", verified ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : web ? "bg-sky-500/10 text-sky-700 dark:text-sky-300" : status === "manual" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{(verified || web) && <CheckCircle2 className="h-3 w-3" />}{verified ? "Oficial" : web ? "Dados públicos" : status === "manual" ? "Manual" : "A completar"}</span>; }
function MiniMetric({ label, value }: { label: string; value?: number | null }) { return <div><p className="font-semibold tabular-nums">{value ?? "—"}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p></div>; }
function Metric({ label, value, wide }: { label: string; value?: string | number | null; wide?: boolean }) { return <div className={cn("rounded-2xl bg-muted/55 p-3", wide && "col-span-2")}><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value ?? "Não informado"}</p></div>; }
function Detail({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) { return <div className="flex items-start gap-3 rounded-2xl bg-muted/55 p-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 text-sm font-semibold">{value}</p></div></div>; }
function CompletenessPanel({ building }: { building: Building }) { const completeness = buildingCompleteness(building); const missing = missingBuildingFields(building); return <section className="mt-5 rounded-2xl border bg-muted/25 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Qualidade da ficha</p><p className="mt-0.5 text-xs text-muted-foreground">{completeness >= 80 ? "Pronta para apoiar o atendimento." : "Ficha útil, com campos ainda a confirmar."}</p></div><span className="rounded-xl bg-background px-3 py-2 text-sm font-semibold tabular-nums shadow-sm">{completeness}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-primary" style={{ width: `${completeness}%` }} /></div>{missing.length > 0 && <div className="mt-3"><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Ainda falta confirmar</p><div className="mt-2 flex flex-wrap gap-1.5">{missing.slice(0, 6).map((item) => <span key={item} className="rounded-lg border bg-background px-2.5 py-1 text-xs text-muted-foreground">{item}</span>)}</div></div>}</section>; }
function formatRange(min?: number | null, max?: number | null) { if (min == null && max == null) return null; return min === max || max == null ? `${min}` : min == null ? `Até ${max}` : `${min} a ${max}`; }
function formatAreaRange(min?: number | null, max?: number | null) { const value = formatRange(min, max); return value ? `${value} m²` : null; }
function coverTone(neighborhood: string) { if (normalize(neighborhood).includes("navegantes")) return "bg-[linear-gradient(135deg,#082F49,#0E7490)]"; if (normalize(neighborhood).includes("zona nova")) return "bg-[linear-gradient(135deg,#12382B,#2E7D59)]"; return "bg-[linear-gradient(135deg,#111827,#4B5563)]"; }
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim(); }
function buildingCompleteness(building: Building) { const checks = [Boolean(building.coverUrl), Boolean(building.builder), Boolean(building.constructionYear || building.deliveryYear), Boolean(building.floors), Boolean(building.totalUnits), Boolean(building.elevators), Boolean(building.bedroomsMin || building.bedroomsMax), Boolean(building.privateAreaMin || building.privateAreaMax), Boolean(building.amenities?.length), Boolean(building.description)]; return checks.filter(Boolean).length * 10; }
function missingBuildingFields(building: Building) { const fields = [[building.coverUrl, "Fachada"], [building.builder, "Construtora"], [building.constructionYear || building.deliveryYear, "Ano"], [building.floors, "Andares"], [building.totalUnits, "Total de unidades"], [building.elevators, "Elevadores"], [building.bedroomsMin || building.bedroomsMax, "Dormitórios"], [building.privateAreaMin || building.privateAreaMax, "Áreas privativas"]] as const; return fields.filter(([value]) => !value).map(([, label]) => label); }
