import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useProfile } from "@/features/profile/use-profile";
import type { MarketNews } from "@/types/database";

export function NewsStoryDialog({ news, open, onOpenChange }: { news?: MarketNews; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  if (!news) return null;
  const brand = profile?.nome_marca || profile?.empresa || profile?.nome || "Agenda do Corretor";
  const logo = profile?.logo || "/brand/mv-broker-logo.jpg";

  async function createStory(share: boolean) {
    setCreating(true);
    try {
      const blob = await renderStory(news!, brand, logo);
      const file = new File([blob], `story-${slug(news!.title)}.png`, { type: "image/png" });
      if (share && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: news!.story_headline, text: news!.story_cta, files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url; anchor.download = file.name; anchor.click(); URL.revokeObjectURL(url);
        toast({ title: share ? "O compartilhamento não está disponível. O story foi baixado." : "Story baixado." });
      }
    } catch { toast({ title: "Não foi possível criar o story.", variant: "error" }); }
    finally { setCreating(false); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-md">
    <DialogHeader><DialogTitle>Story de mercado</DialogTitle><DialogDescription>Informação resumida, fonte visível e identidade do seu perfil.</DialogDescription></DialogHeader>
    <div className="mx-auto aspect-[9/16] max-h-[62vh] w-auto overflow-hidden rounded-[1.75rem] border border-amber-300/20 bg-[#07101a] text-white shadow-2xl">
      <div className="relative flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(3,9,16,.3),#03080e_84%),url('/brand/capao-sunset.png')] bg-cover bg-center p-4">
        <div className="flex items-center gap-2"><img src={logo} alt="" className="h-9 w-9 rounded-lg border border-white/20 object-cover" /><div><p className="text-xs font-semibold">{brand}</p><p className="text-[9px] text-white/55">Radar do mercado</p></div></div>
        <div className="my-auto"><span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[9px] font-bold uppercase text-amber-200">{news.category}</span><h3 className="mt-4 text-2xl font-semibold leading-[1.08]">{news.story_headline}</h3><p className="mt-4 text-xs leading-5 text-white/72">{news.story_body}</p><p className="mt-4 border-l-2 border-amber-300 pl-3 text-xs font-semibold leading-5 text-amber-100">{news.story_cta}</p></div>
        <div><p className="text-[9px] uppercase text-white/38">Fonte: {news.source_name} · {new Date(news.published_at).toLocaleDateString("pt-BR")}</p><p className="mt-2 text-[9px] text-white/25">Consulte a notícia completa antes de tomar decisões.</p></div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3"><Button variant="outline" disabled={creating} onClick={() => void createStory(false)}><Download className="h-4 w-4" />Baixar</Button><Button disabled={creating} onClick={() => void createStory(true)}><Share2 className="h-4 w-4" />Compartilhar</Button></div>
  </DialogContent></Dialog>;
}

async function renderStory(news: MarketNews, brand: string, logo: string) {
  const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas indisponível");
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920); gradient.addColorStop(0, "#102638"); gradient.addColorStop(.48, "#07121d"); gradient.addColorStop(1, "#020508"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1080, 1920);
  try { const bg = await loadImage("/brand/capao-sunset.png"); ctx.globalAlpha = .2; ctx.drawImage(bg, 0, 0, 1080, 720); ctx.globalAlpha = 1; } catch { /* gradient remains */ }
  try { const img = await loadImage(logo); ctx.save(); ctx.beginPath(); ctx.roundRect(72, 72, 120, 120, 24); ctx.clip(); ctx.drawImage(img, 72, 72, 120, 120); ctx.restore(); } catch { ctx.fillStyle = "#d6a73f"; ctx.fillRect(72, 72, 120, 120); }
  ctx.fillStyle = "#fff"; ctx.font = "600 34px system-ui"; ctx.fillText(brand.slice(0, 34), 220, 120); ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "500 23px system-ui"; ctx.fillText("RADAR DO MERCADO", 220, 163);
  ctx.fillStyle = "#e8c86d"; ctx.font = "700 26px system-ui"; ctx.fillText(news.category.toUpperCase(), 74, 490);
  ctx.fillStyle = "#fff"; drawWrapped(ctx, news.story_headline, 72, 560, 920, 88, "700 72px system-ui", 5);
  ctx.fillStyle = "rgba(255,255,255,.73)"; drawWrapped(ctx, news.story_body, 72, 1010, 900, 52, "400 36px system-ui", 5);
  ctx.fillStyle = "#e8c86d"; ctx.fillRect(72, 1390, 5, 160); ctx.fillStyle = "#f9edc9"; drawWrapped(ctx, news.story_cta, 105, 1410, 820, 49, "600 34px system-ui", 3);
  ctx.fillStyle = "rgba(255,255,255,.42)"; ctx.font = "500 21px system-ui"; ctx.fillText(`FONTE: ${news.source_name.toUpperCase()} · ${new Date(news.published_at).toLocaleDateString("pt-BR")}`, 72, 1782); ctx.fillStyle = "rgba(255,255,255,.27)"; ctx.font = "400 18px system-ui"; ctx.fillText("Consulte a notícia completa antes de tomar decisões.", 72, 1824);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Falha ao gerar")), "image/png"));
}

function drawWrapped(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number, font: string, maxLines: number) { ctx.font = font; const words = text.split(" "); let line = ""; let lines = 0; for (const word of words) { const next = `${line}${word} `; if (ctx.measureText(next).width > width && line) { ctx.fillText(line.trim(), x, y); line = `${word} `; y += lineHeight; lines++; if (lines >= maxLines - 1) break; } else line = next; } ctx.fillText(line.trim(), x, y); }
function loadImage(src: string) { return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.crossOrigin = "anonymous"; image.onload = () => resolve(image); image.onerror = reject; image.src = src; }); }
function slug(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 55); }
