import { Check, Moon, Palette, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getPalette, palettes, type PaletteId } from "@/lib/appearance";

export function SettingsPage({
  dark,
  onDarkChange,
  palette,
  onPaletteChange,
  customColor,
  onCustomColorChange
}: {
  dark: boolean;
  onDarkChange: (dark: boolean) => void;
  palette: PaletteId;
  onPaletteChange: (palette: PaletteId) => void;
  customColor: string;
  onCustomColorChange: (color: string) => void;
}) {
  const selected = getPalette(palette);

  return (
    <div className="space-y-5">
      <section className="theme-gradient overflow-hidden rounded-[2rem] p-5 text-white shadow-[0_24px_70px_rgba(6,10,18,0.22)] md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Identidade visual
            </div>
            <h1 className="text-3xl font-semibold md:text-5xl">Sua agenda, do seu jeito.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
              Escolha uma identidade completa e alterne entre claro e escuro sem perder contraste.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/12 bg-black/20 p-1.5 backdrop-blur-xl">
            <button type="button" onClick={() => onDarkChange(false)} className={cn("flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white/55 transition", !dark && "bg-white text-[#111827] shadow-lg")}><Sun className="h-4 w-4" />Claro</button>
            <button type="button" onClick={() => onDarkChange(true)} className={cn("flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white/55 transition", dark && "bg-white text-[#111827] shadow-lg")}><Moon className="h-4 w-4" />Escuro</button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Paletas premium</CardTitle>
            <CardDescription>Quatro combinações completas para toda a interface.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {palettes.map((item) => {
              const active = palette === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPaletteChange(item.id)}
                  aria-pressed={active}
                  className={cn(
                    "group overflow-hidden rounded-[1.35rem] border bg-card text-left shadow-[0_6px_24px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,0.10)]",
                    active && "border-primary ring-2 ring-primary/20"
                  )}
                >
                  <div className="relative h-24 overflow-hidden p-3" style={{ backgroundImage: item.gradient }}>
                    <div className="absolute inset-x-3 bottom-3 flex items-end gap-2">
                      <span className="h-10 flex-1 rounded-xl border border-white/15 bg-white/10 backdrop-blur" />
                      <span className="h-7 w-16 rounded-lg" style={{ backgroundColor: item.preview }} />
                    </div>
                    {active && <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white text-[#101828] shadow-lg"><Check className="h-4 w-4" /></span>}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{item.name}</h3>
                      <span className="flex -space-x-1.5">{item.swatches.map((color) => <span key={color} className="h-5 w-5 rounded-full border-2 border-card" style={{ backgroundColor: color }} />)}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-5 text-muted-foreground">{item.description}</p>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cor da sua marca</CardTitle>
            <CardDescription>Uma quinta opção para destacar a identidade do corretor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button type="button" onClick={() => onPaletteChange("custom")} className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition", palette === "custom" && "border-primary ring-2 ring-primary/20")}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl shadow-inner" style={{ backgroundColor: customColor }}><Palette className="h-5 w-5 text-white drop-shadow" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Personalizada</span><span className="block truncate text-xs text-muted-foreground">{customColor.toUpperCase()}</span></span>
              {palette === "custom" && <Check className="h-4 w-4 text-primary" />}
            </button>
            <div className="space-y-2">
              <Label htmlFor="custom-color">Selecionar cor</Label>
              <div className="flex gap-3">
                <Input id="custom-color" type="color" value={customColor} onChange={(event) => { onCustomColorChange(event.target.value); onPaletteChange("custom"); }} className="h-12 w-16 shrink-0 cursor-pointer p-1" />
                <Input value={customColor} onChange={(event) => { onCustomColorChange(event.target.value); onPaletteChange("custom"); }} maxLength={7} />
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/45 p-4">
              <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Prévia ativa</p><p className="mt-1 font-semibold">{palette === "custom" ? "Personalizada" : selected.name}</p></div><span className="h-9 w-9 rounded-xl bg-primary shadow-[0_8px_20px_hsl(var(--primary)/0.24)]" /></div>
              <Button className="mt-4 w-full">Concluir compromisso</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
