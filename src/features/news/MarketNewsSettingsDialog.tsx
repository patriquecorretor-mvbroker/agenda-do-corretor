import { useEffect, useState } from "react";
import { Bell, Check, Clock3, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { MarketNews, MarketNewsSettings } from "@/types/database";

const categories: MarketNews["category"][] = ["litoral", "mercado", "crédito", "investimento", "legislação"];
const regions = ["Litoral Norte/RS", "Rio Grande do Sul", "Brasil"];

export function MarketNewsSettingsDialog({ open, settings, saving, onOpenChange, onSave }: { open: boolean; settings: MarketNewsSettings; saving: boolean; onOpenChange: (open: boolean) => void; onSave: (settings: MarketNewsSettings) => Promise<void> }) {
  const [draft, setDraft] = useState(settings);
  useEffect(() => { if (open) setDraft(settings); }, [open, settings]);

  function toggle<T extends string>(items: T[], value: T) {
    return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg">
    <DialogHeader><DialogTitle>Preferências do radar</DialogTitle><DialogDescription>Escolha o que deve aparecer primeiro no seu briefing diário.</DialogDescription></DialogHeader>

    <button type="button" aria-pressed={draft.enabled} onClick={() => setDraft((value) => ({ ...value, enabled: !value.enabled }))} className="flex w-full items-center justify-between rounded-2xl border bg-card p-4 text-left">
      <span className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Bell className="h-5 w-5" /></span><span><strong className="block text-sm">Briefing diário</strong><span className="text-xs text-muted-foreground">Prepara o radar no horário escolhido.</span></span></span>
      <span className={cn("relative h-6 w-11 rounded-full bg-muted transition", draft.enabled && "bg-primary")}><span className={cn("absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition", draft.enabled && "translate-x-5")} /></span>
    </button>

    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="news-time" className="flex items-center gap-2"><Clock3 className="h-4 w-4" />Horário</Label><Input id="news-time" type="time" value={draft.delivery_time.slice(0, 5)} onChange={(event) => setDraft((value) => ({ ...value, delivery_time: event.target.value }))} /></div>
      <div className="rounded-xl border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Entrega preparada</strong><br />O envio por notificação será ativado quando o serviço de push estiver conectado.</div>
    </div>

    <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">Assuntos prioritários</legend><div className="flex flex-wrap gap-2">{categories.map((category) => <button key={category} type="button" onClick={() => setDraft((value) => ({ ...value, categories: toggle(value.categories, category) }))} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold capitalize", draft.categories.includes(category) ? "border-primary bg-primary/10 text-primary" : "bg-card")}>
      {draft.categories.includes(category) && <Check className="h-3.5 w-3.5" />}{category}
    </button>)}</div></fieldset>

    <fieldset className="space-y-2"><legend className="mb-2 flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4" />Regiões</legend><div className="flex flex-wrap gap-2">{regions.map((region) => <button key={region} type="button" onClick={() => setDraft((value) => ({ ...value, regions: toggle(value.regions, region) }))} className={cn("rounded-full border px-3 py-2 text-xs font-semibold", draft.regions.includes(region) ? "border-primary bg-primary/10 text-primary" : "bg-card")}>{region}</button>)}</div></fieldset>

    <Button disabled={saving || !draft.categories.length || !draft.regions.length} onClick={() => void onSave(draft)}>{saving ? "Salvando..." : "Salvar preferências"}</Button>
  </DialogContent></Dialog>;
}
