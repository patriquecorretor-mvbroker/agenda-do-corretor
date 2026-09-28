import { useMemo, useState } from "react";
import { Bookmark, Bot, Check, Clock3, ExternalLink, MessageCircle, Newspaper, RefreshCw, Search, Share2, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { MarketNews } from "@/types/database";
import { NewsStoryDialog } from "./NewsStoryDialog";
import { useMarketNews } from "./use-market-news";

const categories = ["todas", "litoral", "mercado", "crédito", "investimento", "legislação"] as const;

export function MarketNewsPage() {
  const { news, isLoading, error, setState, refresh } = useMarketNews();
  const { toast } = useToast();
  const [category, setCategory] = useState<(typeof categories)[number]>("todas");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MarketNews>();
  const [story, setStory] = useState<MarketNews>();
  const [refreshing, setRefreshing] = useState(false);
  const filtered = useMemo(() => news.filter((item) => (category === "todas" || item.category === category) && `${item.title} ${item.summary} ${item.region}`.toLowerCase().includes(query.toLowerCase())), [news, category, query]);
  const today = news.filter((item) => Date.now() - new Date(item.published_at).getTime() < 86400000).length;

  async function open(item: MarketNews) { setSelected(item); if (!item.read) await setState({ id: item.id, patch: { read: true } }); }
  async function toggleSaved(item: MarketNews) { await setState({ id: item.id, patch: { saved: !item.saved } }); toast({ title: item.saved ? "Removida dos favoritos." : "Notícia salva." }); }
  async function copyArgument(item: MarketNews) { await navigator.clipboard.writeText(item.whatsapp_script); toast({ title: "Mensagem de venda copiada para o WhatsApp." }); }
  async function update() { setRefreshing(true); try { await refresh(); toast({ title: "Radar atualizado." }); } catch { toast({ title: "A atualização automática ainda não está configurada.", variant: "error" }); } finally { setRefreshing(false); } }

  return <div className="mx-auto w-full max-w-[1600px] space-y-5">
    <header className="relative overflow-hidden rounded-[1.75rem] border bg-[#07111d] px-5 py-6 text-white shadow-[0_18px_50px_rgba(6,15,25,.18)] sm:px-7 sm:py-8">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,12,21,.96),rgba(4,12,21,.72),rgba(4,12,21,.92)),url('/brand/capao-sunset.png')] bg-cover bg-center opacity-90" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-200"><TrendingUp className="h-4 w-4" />Inteligência comercial</div><h1 className="text-3xl font-semibold sm:text-4xl">Radar do mercado</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">Notícias relevantes traduzidas em contexto, argumento de venda e conteúdo pronto para publicar.</p></div><Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" disabled={refreshing} onClick={() => void update()}><RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />Atualizar radar</Button></div>
    </header>

    <section className="grid grid-cols-3 gap-2 sm:gap-3"><Summary label="No radar" value={news.length} icon={Newspaper} /><Summary label="Hoje" value={today} icon={Clock3} /><Summary label="Salvas" value={news.filter((item) => item.saved).length} icon={Bookmark} /></section>

    <section className="space-y-3"><div className="relative"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-12 rounded-2xl bg-card pl-10" placeholder="Buscar assunto, cidade ou região" /></div><div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={cn("shrink-0 rounded-full border bg-card px-4 py-2 text-xs font-semibold capitalize transition", category === item && "border-primary bg-primary text-primary-foreground")}>{item}</button>)}</div></section>

    {error && <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">Não foi possível atualizar as notícias. O histórico disponível continua acessível.</div>}
    {isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-72 rounded-3xl" />)}</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((item) => <NewsCard key={item.id} item={item} onOpen={() => void open(item)} onSave={() => void toggleSaved(item)} onStory={() => setStory(item)} />)}</div>}
    {!isLoading && !filtered.length && <div className="rounded-3xl border bg-card px-5 py-14 text-center"><Newspaper className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-semibold">Nenhuma notícia neste filtro</p><p className="mt-1 text-sm text-muted-foreground">Tente outro tema ou limpe a busca.</p></div>}

    <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(undefined)}>{selected && <DialogContent className="sm:max-w-2xl"><DialogHeader><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-primary"><span>{selected.category}</span><span>•</span><span>{selected.region}</span></div><DialogTitle className="text-2xl leading-tight">{selected.title}</DialogTitle><DialogDescription>{selected.source_name} · {new Date(selected.published_at).toLocaleDateString("pt-BR")}</DialogDescription></DialogHeader><p className="text-sm leading-6 text-muted-foreground">{selected.summary}</p><section className="rounded-2xl border bg-muted/40 p-4"><div className="flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /><h3 className="font-semibold">Como usar na venda</h3></div><p className="mt-3 text-sm leading-6">{selected.sales_argument}</p></section><section className="rounded-2xl border bg-card p-4"><div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-emerald-600" /><h3 className="font-semibold">Mensagem pronta</h3></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{selected.whatsapp_script}</p></section><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Button variant="outline" asChild><a href={selected.source_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Fonte</a></Button><Button variant="outline" onClick={() => void copyArgument(selected)}><MessageCircle className="h-4 w-4" />Copiar</Button><Button variant="outline" onClick={() => void toggleSaved(selected)}>{selected.saved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}Salvar</Button><Button onClick={() => setStory(selected)}><Sparkles className="h-4 w-4" />Story</Button></div></DialogContent>}</Dialog>
    <NewsStoryDialog news={story} open={Boolean(story)} onOpenChange={(open) => !open && setStory(undefined)} />
  </div>;
}

function NewsCard({ item, onOpen, onSave, onStory }: { item: MarketNews; onOpen: () => void; onSave: () => void; onStory: () => void }) { return <Card className={cn("overflow-hidden border-0 shadow-[0_8px_30px_rgba(15,23,42,.07)] ring-1 ring-border/70", !item.read && "ring-primary/35")}><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase text-primary">{item.category}</span><button onClick={onSave} aria-label="Salvar notícia" className={cn("grid h-9 w-9 place-items-center rounded-full border transition", item.saved && "border-primary bg-primary/10 text-primary")}><Bookmark className={cn("h-4 w-4", item.saved && "fill-current")} /></button></div><button onClick={onOpen} className="mt-4 block w-full text-left"><h2 className="text-lg font-semibold leading-snug">{item.title}</h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{item.summary}</p><div className="mt-4 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground"><span>{item.source_name}</span><span>{new Date(item.published_at).toLocaleDateString("pt-BR")}</span></div></button><div className="mt-4 grid grid-cols-2 gap-2"><Button size="sm" variant="outline" onClick={onOpen}><Bot className="h-4 w-4" />Argumento</Button><Button size="sm" onClick={onStory}><Share2 className="h-4 w-4" />Criar story</Button></div></CardContent></Card>; }
function Summary({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) { return <div className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4"><Icon className="h-4 w-4 text-primary" /><p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p><p className="mt-0.5 text-[10px] font-semibold uppercase text-muted-foreground sm:text-xs">{label}</p></div>; }
