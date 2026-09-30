import { useMemo, useState } from "react";
import { Download, FolderOpen, Image as ImageIcon, MapPin, Play, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CityMedia } from "@/types/database";
import { categoryLabels, type SharedCityPage } from "./city-pages";

type PublicFilter = "todos" | "photo" | "video";

export function PublicCityPage({ page }: { page: SharedCityPage }) {
  const [filter, setFilter] = useState<PublicFilter>("todos");
  const [category, setCategory] = useState<string>("todos");
  const categories = useMemo(() => Array.from(new Set(page.media.map((item) => item.category))), [page.media]);
  const visible = page.media.filter((item) => (filter === "todos" || item.media_type === filter) && (category === "todos" || item.category === category));

  return <main className="min-h-screen bg-[#f4f6f8] text-[#0b1220] dark:bg-[#05080d] dark:text-white">
    <section className="relative min-h-[54vh] overflow-hidden bg-[#07111d] text-white">
      <img src={page.profile.coverUrl} alt={page.profile.name} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#05080d] via-[#05080d]/35 to-black/10" />
      <div className="relative mx-auto flex min-h-[54vh] max-w-6xl flex-col justify-end px-5 pb-10 pt-24 sm:px-8 lg:px-10">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75"><MapPin className="h-4 w-4" />{page.profile.state}</div>
        <h1 className="max-w-4xl text-4xl font-semibold sm:text-6xl">{page.profile.name}</h1>
        <p className="mt-3 max-w-xl text-lg text-white/82">{page.profile.tagline}</p>
        <div className="mt-6 flex flex-wrap gap-2">{page.profile.tourUrl && <Button asChild className="bg-white text-black hover:bg-white/90"><a href={safeExternalUrl(page.profile.tourUrl)} target="_blank" rel="noreferrer"><ScanLine className="h-4 w-4" />Tour 360</a></Button>}{page.profile.driveUrl && <Button asChild variant="outline" className="border-white/25 bg-black/20 text-white hover:bg-black/40 hover:text-white"><a href={safeExternalUrl(page.profile.driveUrl)} target="_blank" rel="noreferrer"><FolderOpen className="h-4 w-4" />Abrir materiais</a></Button>}</div>
      </div>
    </section>

    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 lg:px-10">
      <section className="max-w-3xl"><p className="text-sm leading-7 text-[#667085] dark:text-white/65">{page.profile.description}</p></section>
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085] dark:text-white/50">Conheça a cidade</p><h2 className="mt-1 text-2xl font-semibold">Galeria selecionada</h2></div><div className="grid grid-cols-3 rounded-xl bg-white p-1 shadow-sm dark:bg-white/5">{(["todos", "photo", "video"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={cn("rounded-lg px-3 py-2 text-xs font-semibold", filter === item && "bg-[#0b1220] text-white dark:bg-white dark:text-black")}>{item === "todos" ? "Tudo" : item === "photo" ? "Fotos" : "Vídeos"}</button>)}</div></div>
        <div className="flex gap-2 overflow-x-auto pb-1"><Topic active={category === "todos"} label="Todos os assuntos" onClick={() => setCategory("todos")} />{categories.map((item) => <Topic key={item} active={category === item} label={categoryLabels[item]} onClick={() => setCategory(item)} />)}</div>
        {visible.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map((item, index) => <PublicMediaCard key={`${item.title}-${index}`} item={item} />)}</div> : <div className="rounded-2xl border border-dashed border-black/10 bg-white px-5 py-12 text-center dark:border-white/10 dark:bg-white/5"><ImageIcon className="mx-auto h-7 w-7 text-[#98a2b3]" /><p className="mt-3 font-semibold">Nenhuma mídia neste assunto</p></div>}
      </section>
      <footer className="border-t border-black/8 py-6 text-center text-xs text-[#667085] dark:border-white/10 dark:text-white/45">Apresentação preparada pelo seu corretor de imóveis.</footer>
    </div>
  </main>;
}

function PublicMediaCard({ item }: { item: SharedCityPage["media"][number] }) { return <article className="group overflow-hidden rounded-2xl bg-white shadow-[0_8px_28px_rgba(15,23,42,.08)] dark:bg-white/5"><div className="relative aspect-[4/3] overflow-hidden bg-black">{item.media_type === "video" ? <video src={item.url} controls playsInline preload="metadata" className="h-full w-full object-cover" /> : <img src={item.url} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />}{item.media_type === "video" && <span className="pointer-events-none absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white"><Play className="h-4 w-4 fill-current" /></span>}</div><div className="flex items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.title}</p><p className="mt-1 truncate text-xs text-[#667085] dark:text-white/50">{categoryLabels[item.category]}{item.neighborhood ? ` · ${item.neighborhood}` : ""}</p></div><Button size="icon" variant="outline" asChild title="Baixar mídia"><a href={item.url} download target="_blank" rel="noreferrer"><Download className="h-4 w-4" /></a></Button></div></article>; }
function Topic({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className={cn("shrink-0 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold dark:border-white/10 dark:bg-white/5", active && "border-[#0b1220] bg-[#0b1220] text-white dark:border-white dark:bg-white dark:text-black")}>{label}</button>; }
function safeExternalUrl(value: string) { try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : "#"; } catch { return "#"; } }
