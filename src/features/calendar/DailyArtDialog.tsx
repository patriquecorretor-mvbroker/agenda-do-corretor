import { useState } from "react";
import { Download, Image as ImageIcon, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { Profile } from "@/types/database";
import type { SpecialDate } from "./special-dates";

export function DailyArtDialog({
  open,
  onOpenChange,
  special,
  date,
  profile
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  special: SpecialDate;
  date: Date;
  profile?: Profile | null;
}) {
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const brand = profile?.nome_marca || profile?.empresa || profile?.nome || "Agenda do Corretor";
  const logo = profile?.logo || "/brand/mv-broker-logo.jpg";

  async function createArtwork(share: boolean) {
    setCreating(true);
    try {
      const blob = await renderArtwork({ special, brand, logo, date });
      const file = new File([blob], `arte-${special.key}.png`, { type: "image/png" });
      if (share && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: special.title, text: special.message, files: [file] });
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(url);
      toast({ title: share ? "Seu aparelho não permite compartilhar a imagem. A arte foi baixada." : "Arte baixada." });
    } catch {
      toast({ title: "Não foi possível criar a arte.", variant: "error" });
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Arte do dia</DialogTitle>
          <DialogDescription>Pronta para publicar com a identidade cadastrada no seu perfil.</DialogDescription>
        </DialogHeader>
        <div className="aspect-square overflow-hidden rounded-2xl border border-amber-300/20 bg-[radial-gradient(circle_at_82%_12%,_rgba(245,184,54,0.34),_transparent_28%),linear-gradient(145deg,_#020202,_#17110a_58%,_#050403)] p-6 text-white shadow-2xl sm:p-9">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3">
              <img src={logo} alt="" className="h-14 w-14 rounded-xl border border-amber-200/35 object-cover" />
              <div><p className="font-semibold text-amber-200">{brand}</p><p className="text-xs text-white/55">{special.kind}</p></div>
            </div>
            <div className="my-auto">
              <p className="mb-3 text-xs font-semibold uppercase text-amber-300">{date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</p>
              <h3 className="max-w-md text-3xl font-semibold leading-tight sm:text-5xl">{special.title}</h3>
              <p className="mt-5 max-w-md text-sm leading-6 text-white/72 sm:text-base">{special.message}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/45"><ImageIcon className="h-4 w-4" />Criado na Agenda do Corretor</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" disabled={creating} onClick={() => void createArtwork(false)}><Download className="h-4 w-4" />Baixar</Button>
          <Button disabled={creating} onClick={() => void createArtwork(true)}><Share2 className="h-4 w-4" />Compartilhar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function renderArtwork({ special, brand, logo, date }: { special: SpecialDate; brand: string; logo: string; date: Date }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível");
  const gradient = context.createLinearGradient(0, 0, 1080, 1080);
  gradient.addColorStop(0, "#020202");
  gradient.addColorStop(0.62, "#1b1207");
  gradient.addColorStop(1, "#050403");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1080, 1080);
  const glow = context.createRadialGradient(900, 110, 20, 900, 110, 420);
  glow.addColorStop(0, "rgba(243,181,51,.5)");
  glow.addColorStop(1, "rgba(243,181,51,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 1080, 1080);
  try {
    const image = await loadImage(logo);
    context.save();
    context.beginPath();
    context.roundRect(80, 76, 132, 132, 24);
    context.clip();
    context.drawImage(image, 80, 76, 132, 132);
    context.restore();
  } catch {
    context.fillStyle = "#d6a73f";
    context.fillRect(80, 76, 132, 132);
  }
  context.fillStyle = "#f4d889";
  context.font = "600 34px system-ui";
  context.fillText(brand.slice(0, 36), 240, 132);
  context.fillStyle = "rgba(255,255,255,.55)";
  context.font = "500 24px system-ui";
  context.fillText(special.kind.toUpperCase(), 240, 177);
  context.fillStyle = "#e5b94d";
  context.font = "700 25px system-ui";
  context.fillText(date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }).toUpperCase(), 82, 410);
  context.fillStyle = "#ffffff";
  drawWrappedText(context, special.title, 82, 475, 880, 88, "700 72px system-ui");
  context.fillStyle = "rgba(255,255,255,.74)";
  drawWrappedText(context, special.message, 82, 720, 820, 48, "400 34px system-ui");
  context.fillStyle = "rgba(255,255,255,.38)";
  context.font = "400 22px system-ui";
  context.fillText("Agenda do Corretor", 82, 1010);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Falha ao gerar arte")), "image/png"));
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, font: string) {
  context.font = font;
  const words = text.split(" ");
  let line = "";
  for (const word of words) {
    const candidate = `${line}${word} `;
    if (context.measureText(candidate).width > maxWidth && line) { context.fillText(line.trim(), x, y); line = `${word} `; y += lineHeight; }
    else line = candidate;
  }
  context.fillText(line.trim(), x, y);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
