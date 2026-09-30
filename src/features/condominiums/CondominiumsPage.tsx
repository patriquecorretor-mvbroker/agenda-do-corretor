import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, ExternalLink, FileImage, FileText, Film, FolderOpen, LandPlot, MapPin, Navigation, Pencil, Plus, Search, Umbrella, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Condominium, CondominiumAssetType } from "@/types/database";
import { CondominiumFormDialog } from "./CondominiumFormDialog";
import { CondominiumMaterialsDialog } from "./CondominiumMaterialsDialog";
import { condominiumMapsUrl, newCondominium, useCondominiums } from "./use-condominiums";

type Scope = "todos" | "Capão da Canoa" | "Xangri-Lá" | "ativos";
type SortOrder = "alphabetical" | "oldest" | "newest";

export function CondominiumsPage() {
  const { condominiums, isLoading, error, saveCondominium } = useCondominiums();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("todos");
  const [status, setStatus] = useState("todos");
  const [neighborhood, setNeighborhood] = useState("todos");
  const [sortOrder, setSortOrder] = useState<SortOrder>("alphabetical");
  const [selected, setSelected] = useState<Condominium>();
  const [editing, setEditing] = useState<Condominium>();
  const [materials, setMaterials] = useState<{ item: Condominium; filter: CondominiumAssetType | "all" }>();
  const [limit, setLimit] = useState(36);

  const neighborhoods = useMemo(() => Array.from(new Set(condominiums.map((item) => item.neighborhood).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "pt-BR")), [condominiums]);
  const filtered = useMemo(() => {
    const term = normalize(query);
    const matches = condominiums.filter((item) => {
      const matchesScope = scope === "todos" || item.city === scope || (scope === "ativos" && item.status !== "entregue");
      const matchesStatus = status === "todos" || item.status === status;
      const matchesNeighborhood = neighborhood === "todos" || item.neighborhood === neighborhood;
      const matchesSearch = !term || normalize(`${item.name} ${item.city} ${item.neighborhood ?? ""} ${item.developer ?? ""} ${item.unitType}`).includes(term);
      return matchesScope && matchesStatus && matchesNeighborhood && matchesSearch;
    });
    return matches.sort((a, b) => {
      if (sortOrder === "alphabetical") return a.name.localeCompare(b.name, "pt-BR");
      if (a.launchYear == null && b.launchYear == null) return a.name.localeCompare(b.name, "pt-BR");
      if (a.launchYear == null) return 1;
      if (b.launchYear == null) return -1;
      const yearDifference = sortOrder === "oldest" ? a.launchYear - b.launchYear : b.launchYear - a.launchYear;
      return yearDifference || a.name.localeCompare(b.name, "pt-BR");
    });
  }, [condominiums, neighborhood, query, scope, sortOrder, status]);
  const visible = filtered.slice(0, limit);
  const capao = condominiums.filter((item) => item.city === "Capão da Canoa").length;
  const xangri = condominiums.filter((item) => item.city === "Xangri-Lá").length;
  const active = condominiums.filter((item) => item.status !== "entregue").length;

  async function save(item: Condominium) {
    try {
      await saveCondominium(item);
      toast({ title: "Condomínio salvo no catálogo." });
    } catch {
      toast({ title: "Salvo neste dispositivo; sincronização pendente." });
    }
  }

  function clearFilters() {
    setQuery(""); setScope("todos"); setStatus("todos"); setNeighborhood("todos"); setSortOrder("alphabetical"); setLimit(36);
  }

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-medium text-primary">Inteligência do litoral</p><h1 className="mt-1 text-3xl font-semibold">Condomínios</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Catálogo comercial de Capão da Canoa e Xangri-Lá, com situação, localização, construtora e metragem.</p></div>
      <Button className="h-11 w-full sm:w-auto" onClick={() => setEditing(newCondominium())}><Plus className="h-4 w-4" />Novo condomínio</Button>
    </header>

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Summary label="Catálogo" value={condominiums.length} active={scope === "todos"} icon={LandPlot} onClick={() => setScope("todos")} />
      <Summary label="Capão da Canoa" value={capao} active={scope === "Capão da Canoa"} icon={Waves} onClick={() => setScope("Capão da Canoa")} />
      <Summary label="Xangri-Lá" value={xangri} active={scope === "Xangri-Lá"} icon={Umbrella} onClick={() => setScope("Xangri-Lá")} />
      <Summary label="Em obras / lançamentos" value={active} active={scope === "ativos"} icon={CalendarDays} onClick={() => setScope("ativos")} />
    </section>

    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_190px_190px_210px]">
      <div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => { setQuery(event.target.value); setLimit(36); }} className="h-12 rounded-2xl bg-card pl-11" placeholder="Buscar condomínio, bairro ou construtora" /></div>
      <Select value={neighborhood} onValueChange={(value) => { setNeighborhood(value); setLimit(36); }}><SelectTrigger className="h-12 rounded-2xl bg-card"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os bairros</SelectItem>{neighborhoods.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
      <Select value={status} onValueChange={(value) => { setStatus(value); setLimit(36); }}><SelectTrigger className="h-12 rounded-2xl bg-card"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todas as situações</SelectItem><SelectItem value="entregue">Entregues</SelectItem><SelectItem value="em obras">Em obras</SelectItem><SelectItem value="lançamento">Lançamentos</SelectItem><SelectItem value="a confirmar">A confirmar</SelectItem></SelectContent></Select>
      <Select value={sortOrder} onValueChange={(value) => { setSortOrder(value as SortOrder); setLimit(36); }}><SelectTrigger className="h-12 rounded-2xl bg-card"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="alphabetical">Ordem alfabética</SelectItem><SelectItem value="oldest">Mais antigos primeiro</SelectItem><SelectItem value="newest">Mais novos primeiro</SelectItem></SelectContent></Select>
    </section>

    <div className="flex items-center justify-between text-sm text-muted-foreground"><span>{filtered.length} condomínios encontrados</span>{(query || scope !== "todos" || status !== "todos" || neighborhood !== "todos" || sortOrder !== "alphabetical") && <button type="button" onClick={clearFilters} className="font-semibold text-primary">Limpar filtros</button>}</div>
    {error && <div role="alert" className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm">A base local está disponível. A sincronização online será retomada automaticamente.</div>}
    {isLoading && !condominiums.length && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-2xl bg-muted" />)}</div>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {visible.map((item) => <CondominiumCard key={item.id} item={item} onOpen={() => setSelected(item)} onMaterials={(filter) => setMaterials({ item, filter })} />)}
    </section>
    {!visible.length && <div className="rounded-2xl border bg-card px-5 py-14 text-center"><LandPlot className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-semibold">Nenhum condomínio encontrado</p><p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou limpe a busca.</p><Button variant="outline" className="mt-4" onClick={clearFilters}>Limpar filtros</Button></div>}
    {visible.length < filtered.length && <div className="flex justify-center"><Button variant="outline" onClick={() => setLimit((current) => current + 36)}>Mostrar mais {Math.min(36, filtered.length - visible.length)}</Button></div>}

    <CondominiumDetails item={selected} onClose={() => setSelected(undefined)} onEdit={(item) => { setSelected(undefined); setEditing(item); }} onMaterials={(item) => { setSelected(undefined); setMaterials({ item, filter: "all" }); }} />
    {editing && <CondominiumFormDialog open condominium={editing} onOpenChange={(open) => !open && setEditing(undefined)} onSave={save} />}
    <CondominiumMaterialsDialog condominium={materials?.item} initialFilter={materials?.filter} onOpenChange={(open) => !open && setMaterials(undefined)} />
  </div>;
}

function CondominiumCard({ item, onOpen, onMaterials }: { item: Condominium; onOpen: () => void; onMaterials: (filter: CondominiumAssetType) => void }) {
  return <Card className="group overflow-hidden border-0 shadow-[0_8px_28px_rgba(15,23,42,0.07)] ring-1 ring-border/70 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(15,23,42,0.12)]"><button type="button" onClick={onOpen} className="w-full text-left">
    <CondominiumCover item={item} />
    <CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-base font-semibold">{item.name}</h2><p className="mt-1 truncate text-xs text-muted-foreground">{item.developer ?? "Construtora a confirmar"}</p></div><StatusBadge status={item.status} /></div>
      <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5 text-primary" />{item.neighborhood ?? "Bairro a confirmar"} · {item.city}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-center text-xs"><MiniMetric label="Unidades" value={item.totalUnits} /><MiniMetric label="Área total" value={item.areaHa ? `${item.areaHa} ha` : null} /><MiniMetric label="Lançamento" value={item.launchYear} /></div>
    </CardContent>
  </button><div className="grid grid-cols-4 border-t bg-muted/20 p-2"><MaterialShortcut label="Fotos" icon={FileImage} onClick={() => onMaterials("photo")} /><MaterialShortcut label="Vídeos" icon={Film} onClick={() => onMaterials("video")} /><MaterialShortcut label="PDF" icon={FileText} onClick={() => onMaterials("pdf")} /><MaterialShortcut label="Drive" icon={FolderOpen} onClick={() => onMaterials("drive")} /></div></Card>;
}

function CondominiumCover({ item }: { item: Condominium }) {
  const tone = item.city === "Capão da Canoa" ? "from-[#0b2239] via-[#164e63] to-[#d6a84b]" : "from-[#071a2c] via-[#155e75] to-[#0f8a65]";
  return <div className={cn("relative h-36 overflow-hidden bg-gradient-to-br", tone)}>{item.coverUrl ? <img src={item.coverUrl} alt={item.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" /> : <><div className="absolute -right-7 -top-12 h-32 w-32 rounded-full border border-white/10" /><div className="absolute right-6 top-5 h-24 w-24 rounded-full border border-white/10" /><LandPlot className="absolute right-5 top-5 h-12 w-12 text-white/20" /></>}<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" /><div className="absolute bottom-4 left-4 flex items-center gap-2"><span className="rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">{item.city}</span>{item.hasBeachClub && <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">Paradouro</span>}</div></div>;
}

function CondominiumDetails({ item, onClose, onEdit, onMaterials }: { item?: Condominium; onClose: () => void; onEdit: (item: Condominium) => void; onMaterials: (item: Condominium) => void }) {
  return <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>{item && <DialogContent className="sm:max-w-3xl">
    <Button type="button" variant="outline" size="sm" onClick={onClose} className="absolute left-4 top-4 z-20 border-white/25 bg-black/55 text-white shadow-lg backdrop-blur hover:bg-black/75 hover:text-white"><ArrowLeft className="h-4 w-4" />Voltar</Button>
    <div className="-mx-5 -mt-5 mb-5 overflow-hidden rounded-t-[2rem]"><CondominiumCover item={item} /></div>
    <DialogHeader><div className="pr-8"><DialogTitle className="text-2xl">{item.name}</DialogTitle><DialogDescription className="mt-1">{item.neighborhood ?? "Bairro a confirmar"} · {item.city}/RS</DialogDescription></div></DialogHeader>
    {catalogDescription(item.description) && <p className="text-sm leading-6 text-muted-foreground">{catalogDescription(item.description)}</p>}
    <section className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="Situação" value={item.status} /><Metric label="Construtora" value={item.developer} wide /><Metric label="Lançamento" value={item.launchYear} /><Metric label="Unidades" value={item.totalUnits} /><Metric label="Área total" value={item.areaHa ? `${item.areaHa} ha` : null} /><Metric label="Tipologia" value={item.unitType} /><Metric label="Metragem" value={areaLabel(item)} /></section>
    <section className="mt-5"><p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Estrutura comercial</p><div className="flex flex-wrap gap-2">{item.hasBeachClub && <Chip icon={Umbrella} label="Paradouro" />}{item.amenities.filter((value) => value !== "Paradouro").map((value) => <Chip key={value} icon={CheckCircle2} label={value} />)}{!item.amenities.length && !item.hasBeachClub && <span className="text-sm text-muted-foreground">Infraestrutura ainda não cadastrada.</span>}</div></section>
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><Button variant="outline" onClick={() => onEdit(item)}><Pencil className="h-4 w-4" />Editar</Button><Button variant="outline" onClick={() => onMaterials(item)}><FolderOpen className="h-4 w-4" />Materiais</Button><Button variant="outline" asChild><a href={condominiumMapsUrl(item)} target="_blank" rel="noreferrer"><Navigation className="h-4 w-4" />Abrir no mapa</a></Button><Button onClick={async () => navigator.clipboard.writeText(`${item.name} · ${item.city} · ${item.neighborhood ?? ""}`)}><ExternalLink className="h-4 w-4" />Copiar ficha</Button></div>
  </DialogContent>}</Dialog>;
}

function Summary({ label, value, active, icon: Icon, onClick }: { label: string; value: number; active: boolean; icon: React.ElementType; onClick: () => void }) { return <button type="button" onClick={onClick} className={cn("rounded-2xl border p-4 text-left shadow-sm transition", active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/35")}><div className="flex items-center justify-between gap-2"><p className={cn("text-[11px] font-semibold uppercase", active ? "text-primary-foreground/70" : "text-muted-foreground")}>{label}</p><Icon className="h-4 w-4" /></div><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></button>; }
function MaterialShortcut({ label, icon: Icon, onClick }: { label: string; icon: React.ElementType; onClick: () => void }) { return <button type="button" onClick={onClick} className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold text-muted-foreground transition hover:bg-card hover:text-foreground" title={`Abrir ${label}`}><Icon className="h-4 w-4 text-primary" /><span>{label}</span></button>; }
function MiniMetric({ label, value }: { label: string; value: string | number | null }) { return <div><p className="font-semibold tabular-nums">{value ?? "—"}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p></div>; }
function Metric({ label, value, wide }: { label: string; value: string | number | null; wide?: boolean }) { return <div className={cn("rounded-2xl bg-muted/55 p-3", wide && "col-span-2")}><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold capitalize">{value ?? "Não informado"}</p></div>; }
function Chip({ icon: Icon, label }: { icon: React.ElementType; label: string }) { return <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold"><Icon className="h-3.5 w-3.5 text-primary" />{label}</span>; }
function StatusBadge({ status }: { status: Condominium["status"] }) { return <span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase", status === "entregue" ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : status === "lançamento" ? "bg-primary/12 text-primary" : "bg-amber-500/12 text-amber-700 dark:text-amber-300")}>{status}</span>; }
function catalogDescription(value: string | null) { return value?.replace(/\s*Dados cadastrais compilados de fonte pública[^.]*\.?/gi, "").trim() || null; }
function areaLabel(item: Condominium) { if (item.areaMin == null && item.areaMax == null) return null; if (item.areaMin === item.areaMax || item.areaMax == null) return `${item.areaMin} m²`; if (item.areaMin == null) return `Até ${item.areaMax} m²`; return `${item.areaMin} a ${item.areaMax} m²`; }
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim(); }
