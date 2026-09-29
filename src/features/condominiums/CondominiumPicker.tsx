import { useMemo, useState } from "react";
import { Check, LandPlot, MapPin, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Condominium } from "@/types/database";
import { useCondominiums } from "./use-condominiums";

export function CondominiumPicker({ value, onChange }: { value?: string | null; onChange: (item: Condominium | null) => void }) {
  const { condominiums } = useCondominiums();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = condominiums.find((item) => item.id === value);
  const matches = useMemo(() => {
    const term = normalize(query);
    if (!term) return condominiums.slice(0, 40);
    return condominiums.filter((item) => normalize(`${item.name} ${item.city} ${item.neighborhood ?? ""} ${item.developer ?? ""}`).includes(term)).slice(0, 60);
  }, [condominiums, query]);

  function select(item: Condominium | null) {
    onChange(item); setOpen(false); setQuery("");
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="flex min-h-12 w-full items-center gap-3 rounded-lg border bg-background px-3 text-left transition hover:border-primary/45">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><LandPlot className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1">{selected ? <><span className="block truncate text-sm font-semibold">{selected.name}</span><span className="block truncate text-xs text-muted-foreground">{selected.neighborhood ?? "Bairro a confirmar"} · {selected.city}</span></> : <span className="text-sm text-muted-foreground">Selecionar condomínio</span>}</span>
    </button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] overflow-hidden p-0 sm:max-w-xl">
      <DialogHeader className="p-5 pb-0"><DialogTitle>Selecionar condomínio</DialogTitle><DialogDescription>{condominiums.length} opções em Capão da Canoa e Xangri-Lá.</DialogDescription></DialogHeader>
      <div className="relative px-5"><Search className="absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} className="pl-10" placeholder="Nome, cidade, bairro ou construtora" /></div>
      <div className="max-h-[58dvh] overflow-y-auto border-t p-2">
        {selected && <button type="button" onClick={() => select(null)} className="mb-1 flex min-h-11 w-full items-center rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted">Remover condomínio</button>}
        {matches.map((item) => <button key={item.id} type="button" onClick={() => select(item)} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-muted", selected?.id === item.id && "bg-primary/10")}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-primary"><LandPlot className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.name}</span><span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{item.neighborhood ?? "Bairro a confirmar"} · {item.city}</span></span>
          {selected?.id === item.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
        </button>)}
        {!matches.length && <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhum condomínio encontrado.</p>}
      </div>
    </DialogContent></Dialog>
  </>;
}

function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim(); }
