import { Moon, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { palettes, type PaletteId } from "@/lib/appearance";

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
  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.34),_transparent_32%),linear-gradient(135deg,_#050403,_#15100b_56%,_#050403)] p-5 text-white shadow-soft md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Palette className="h-3.5 w-3.5" />
              Aparência
            </div>
            <h1 className="text-3xl font-semibold md:text-5xl">Personalize sua agenda.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
              Escolha o modo de visualização e a cor principal usada em botões, destaques, agenda e navegação.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-3xl border border-white/10 bg-white/[0.06] p-2">
            <Button type="button" variant={!dark ? "default" : "ghost"} onClick={() => onDarkChange(false)}>
              <Sun className="h-4 w-4" />
              Claro
            </Button>
            <Button type="button" variant={dark ? "default" : "ghost"} onClick={() => onDarkChange(true)}>
              <Moon className="h-4 w-4" />
              Escuro
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Paleta da agenda</CardTitle>
            <CardDescription>As mudanças ficam salvas neste dispositivo.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {palettes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onPaletteChange(item.id)}
                className={cn(
                  "rounded-3xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft",
                  palette === item.id && "border-primary ring-2 ring-primary/25"
                )}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl shadow-sm" style={{ backgroundColor: item.id === "custom" ? customColor : item.preview }}>
                    <span className="h-5 w-5 rounded-full border border-white/70 bg-white/20" />
                  </span>
                  {palette === item.id && <span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">Ativa</span>}
                </div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cor personalizada</CardTitle>
            <CardDescription>Use para aproximar a agenda da sua marca.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-color">Cor principal</Label>
              <div className="flex gap-3">
                <Input
                  id="custom-color"
                  type="color"
                  value={customColor}
                  onChange={(event) => {
                    onCustomColorChange(event.target.value);
                    onPaletteChange("custom");
                  }}
                  className="h-12 w-16 shrink-0 p-1"
                />
                <Input
                  value={customColor}
                  onChange={(event) => {
                    onCustomColorChange(event.target.value);
                    onPaletteChange("custom");
                  }}
                  maxLength={7}
                />
              </div>
            </div>
            <div className="rounded-3xl border bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.28),_transparent_36%),linear-gradient(135deg,_hsl(var(--card)),_hsl(var(--muted)))] p-4">
              <p className="text-sm text-muted-foreground">Prévia</p>
              <p className="mt-1 text-2xl font-semibold">Visita às 10:00</p>
              <div className="mt-4 flex gap-2">
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">visita</span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">agendado</span>
              </div>
              <Button className="mt-4 w-full">Concluir compromisso</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
