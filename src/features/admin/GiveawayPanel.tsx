import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, Copy, Gift, History, MapPin, Sparkles, Trophy, Users, Video, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { secureRandomIndex, winnerRotation } from "./giveaway-utils";
import type { GiveawayInput, SaasGiveawayDraw, SaasMember, SaasPlan } from "./use-saas-admin";

const defaultPrize = {
  title: "Exclusividade do Corretor",
  description: "Produção completa para um imóvel exclusivo: ensaio fotográfico profissional, vídeo vertical para redes sociais e material pronto para divulgação."
};

export function GiveawayPanel({ members, plans, history, saving, onSave }: {
  members: SaasMember[];
  plans: SaasPlan[];
  history: SaasGiveawayDraw[];
  saving: boolean;
  onSave: (draw: GiveawayInput) => Promise<void>;
}) {
  const { toast } = useToast();
  const eligible = useMemo(() => members.filter((member) => member.status === "active"), [members]);
  const [prizeTitle, setPrizeTitle] = useState(defaultPrize.title);
  const [prizeDescription, setPrizeDescription] = useState(defaultPrize.description);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spinDuration, setSpinDuration] = useState(5400);
  const [sound, setSound] = useState(true);
  const [passingName, setPassingName] = useState("Pronto para sortear");
  const [winner, setWinner] = useState<SaasMember | null>(null);
  const timers = useRef<number[]>([]);
  const audio = useRef<AudioContext | null>(null);

  useEffect(() => () => {
    timers.current.forEach(window.clearTimeout);
    void audio.current?.close();
  }, []);

  async function draw() {
    if (eligible.length < 2) {
      toast({ title: "É preciso ter pelo menos 2 assinantes ativos para sortear.", variant: "error" });
      return;
    }
    if (!prizeTitle.trim()) {
      toast({ title: "Informe o nome do prêmio.", variant: "error" });
      return;
    }

    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setWinner(null);
    setSpinning(true);
    const index = secureRandomIndex(eligible.length);
    const selected = eligible[index];
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 900 : 5400;
    setSpinDuration(duration);
    setRotation((current) => winnerRotation(current, index, eligible.length));
    startTicks(duration, eligible, sound, audio, timers, setPassingName);

    timers.current.push(window.setTimeout(async () => {
      setPassingName(selected.name);
      setWinner(selected);
      setSpinning(false);
      if (sound) playVictory(audio);
      const planName = plans.find((plan) => plan.id === selected.plan_id)?.name ?? "Plano não informado";
      try {
        await onSave({
          winner_user_id: selected.user_id,
          winner_name: selected.name,
          winner_email: selected.email,
          winner_city: selected.city,
          winner_plan_name: planName,
          prize_title: prizeTitle.trim(),
          prize_description: prizeDescription.trim() || null,
          participant_count: eligible.length,
          participant_user_ids: eligible.map((member) => member.user_id)
        });
        toast({ title: `${selected.name} venceu o sorteio!` });
      } catch (error) {
        toast({ title: error instanceof Error ? error.message : "O vencedor saiu, mas o histórico não pôde ser salvo.", variant: "error" });
      }
    }, duration + 100));
  }

  async function copyAnnouncement() {
    if (!winner) return;
    const text = `Parabéns, ${winner.name}! Você ganhou o sorteio ${prizeTitle} da Agenda do Corretor. Em breve entraremos em contato para organizar a produção de fotos e vídeos.`;
    await navigator.clipboard.writeText(text);
    toast({ title: "Mensagem do vencedor copiada." });
  }

  return <div className="space-y-4">
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#07090d] text-white shadow-[0_24px_80px_rgba(0,0,0,.24)]">
      <div className="border-b border-white/10 px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#d8b76c]"><Sparkles className="h-4 w-4" />Clube de assinantes</p><h2 className="mt-2 text-2xl font-semibold">Sorteio da exclusividade</h2><p className="mt-1 text-sm text-white/55">Todos os assinantes ativos participam automaticamente.</p></div>
          <div className="flex items-center gap-2"><span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300">{eligible.length} ativos</span><Button type="button" size="icon" variant="outline" title={sound ? "Desativar som" : "Ativar som"} aria-label={sound ? "Desativar som" : "Ativar som"} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => setSound((value) => !value)}>{sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</Button></div>
        </div>
      </div>

      <div className="grid gap-7 p-5 sm:p-7 xl:grid-cols-[minmax(320px,520px)_minmax(0,1fr)] xl:items-center">
        <div className="mx-auto w-full max-w-[500px]">
          <div className="relative mx-auto aspect-square w-full max-w-[440px]">
            <div className="absolute left-1/2 top-0 z-20 h-0 w-0 -translate-x-1/2 -translate-y-1 border-l-[16px] border-r-[16px] border-t-[30px] border-l-transparent border-r-transparent border-t-[#f2cf7a] drop-shadow-[0_4px_8px_rgba(242,207,122,.5)]" />
            <div className="absolute inset-2 rounded-full bg-[#d8b76c]/20 blur-xl" />
            <div
              className="absolute inset-3 overflow-hidden rounded-full border-[7px] border-[#d8b76c] shadow-[inset_0_0_0_2px_rgba(255,255,255,.24),0_18px_50px_rgba(0,0,0,.5)]"
              style={{ background: wheelGradient(eligible.length), transform: `rotate(${rotation}deg)`, transition: spinning ? `transform ${spinDuration}ms cubic-bezier(.12,.68,.08,1)` : "none" }}
            >
              {eligible.slice(0, 24).map((member, index) => {
                const angle = (index + 0.5) * 360 / eligible.length;
                const radians = (angle - 90) * Math.PI / 180;
                return <span key={member.user_id} className="absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/45 text-[9px] font-bold text-white shadow-sm" style={{ left: `${50 + Math.cos(radians) * 34}%`, top: `${50 + Math.sin(radians) * 34}%` }} title={member.name}>{initials(member.name)}</span>;
              })}
              <div className="absolute inset-[37%] grid place-items-center rounded-full border-4 border-[#d8b76c] bg-[#080b10] shadow-[0_0_28px_rgba(216,183,108,.4)]"><Gift className="h-8 w-8 text-[#f2cf7a]" /></div>
            </div>
          </div>
          <div aria-live="polite" className="mx-auto -mt-1 min-h-20 max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center backdrop-blur">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">{spinning ? "Girando agora" : winner ? "Vencedor" : "Roleta pronta"}</p>
            <p className={cn("mt-1 truncate text-xl font-semibold", winner && "text-[#f2cf7a]")}>{passingName}</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#d8b76c]/15 text-[#f2cf7a]"><Trophy className="h-5 w-5" /></span><div><p className="font-semibold">Prêmio desta rodada</p><p className="text-xs text-white/45">Personalize antes de girar</p></div></div>
            <div className="mt-5 space-y-4"><div><Label htmlFor="giveaway-title" className="text-white/70">Nome do prêmio</Label><Input id="giveaway-title" value={prizeTitle} onChange={(event) => setPrizeTitle(event.target.value)} disabled={spinning} className="mt-2 border-white/10 bg-black/25 text-white" /></div><div><Label htmlFor="giveaway-description" className="text-white/70">O que o vencedor recebe</Label><Textarea id="giveaway-description" value={prizeDescription} onChange={(event) => setPrizeDescription(event.target.value)} disabled={spinning} className="mt-2 min-h-24 border-white/10 bg-black/25 text-white" /></div></div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/65 sm:grid-cols-4"><PrizeItem icon={Camera} label="Fotos" /><PrizeItem icon={Video} label="Vídeo" /><PrizeItem icon={Sparkles} label="Edição" /><PrizeItem icon={CheckCircle2} label="Divulgação" /></div>
          </div>
          <Button type="button" size="lg" onClick={() => void draw()} disabled={spinning || saving || eligible.length < 2} className="h-14 w-full bg-[#e4c373] text-[#111318] shadow-[0_14px_35px_rgba(216,183,108,.22)] hover:bg-[#f0d58f]">{spinning ? "Sorteando..." : saving ? "Registrando vencedor..." : <><Gift className="h-5 w-5" />Sortear entre {eligible.length} ativos</>}</Button>
          {eligible.length < 2 && <p className="text-center text-xs text-amber-200/75">Cadastre ao menos dois assinantes ativos para liberar a roleta.</p>}
          {winner && <div className="rounded-2xl border border-[#d8b76c]/30 bg-[#d8b76c]/10 p-4"><div className="flex items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e4c373] font-bold text-[#111318]">{initials(winner.name)}</span><div className="min-w-0"><p className="truncate font-semibold text-[#f3d993]">{winner.name}</p><p className="flex items-center gap-1 text-xs text-white/55"><MapPin className="h-3 w-3" />{winner.city}</p></div><Button type="button" size="icon" variant="ghost" title="Copiar anúncio" aria-label="Copiar anúncio" className="ml-auto text-white hover:bg-white/10 hover:text-white" onClick={() => void copyAnnouncement()}><Copy className="h-4 w-4" /></Button></div></div>}
        </div>
      </div>
    </section>

    <section className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
      <div className="rounded-2xl border bg-card p-5"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Participantes desta rodada</h3><p className="text-xs text-muted-foreground">Somente status ativo</p></div><Users className="h-5 w-5 text-primary" /></div><div className="mt-4 max-h-80 space-y-1 overflow-y-auto pr-1">{eligible.length ? eligible.map((member, index) => <div key={member.user_id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/60"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold">{initials(member.name)}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{member.name}</p><p className="truncate text-[10px] text-muted-foreground">{member.city} · {plans.find((plan) => plan.id === member.plan_id)?.name ?? "Plano"}</p></div><span className="text-[10px] tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span></div>) : <p className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">Nenhum assinante ativo na base.</p>}</div></div>
      <div className="rounded-2xl border bg-card p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><History className="h-5 w-5" /></span><div><h3 className="font-semibold">Histórico de sorteios</h3><p className="text-xs text-muted-foreground">Registro de vencedores e tamanho da base participante</p></div></div><div className="mt-4 divide-y">{history.length ? history.map((draw) => <div key={draw.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_150px_110px] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-semibold">{draw.winner_name}</p><p className="truncate text-xs text-muted-foreground">{draw.prize_title} · {draw.winner_city || "Cidade não informada"}</p></div><p className="text-xs text-muted-foreground">{new Date(draw.drawn_at).toLocaleString("pt-BR")}</p><span className="w-fit rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold">{draw.participant_count} participantes</span></div>) : <p className="mt-4 rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">O primeiro vencedor aparecerá aqui.</p>}</div></div>
    </section>
  </div>;
}

function PrizeItem({ icon: Icon, label }: { icon: React.ElementType; label: string }) { return <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2"><Icon className="h-3.5 w-3.5 text-[#e4c373]" />{label}</span>; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?"; }
function wheelGradient(count: number) {
  if (!count) return "conic-gradient(#20242c 0 100%)";
  const colors = ["#d8b76c", "#171b23", "#f3e4bd", "#303743"];
  return `conic-gradient(${Array.from({ length: count }, (_, index) => `${colors[index % colors.length]} ${index * 100 / count}% ${(index + 1) * 100 / count}%`).join(",")})`;
}

function startTicks(duration: number, members: SaasMember[], enabled: boolean, context: React.MutableRefObject<AudioContext | null>, timers: React.MutableRefObject<number[]>, onName: (name: string) => void) {
  const started = performance.now();
  let index = 0;
  const tick = () => {
    const elapsed = performance.now() - started;
    if (elapsed >= duration) return;
    onName(members[index++ % members.length].name);
    if (enabled) playTone(context, 620, 0.025, 0.035);
    const progress = elapsed / duration;
    timers.current.push(window.setTimeout(tick, 55 + Math.pow(progress, 3) * 360));
  };
  tick();
}

function playTone(context: React.MutableRefObject<AudioContext | null>, frequency: number, duration: number, gainValue: number) {
  try {
    const AudioCtor = window.AudioContext;
    context.current ??= new AudioCtor();
    const oscillator = context.current.createOscillator();
    const gain = context.current.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(gainValue, context.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.current.currentTime + duration);
    oscillator.connect(gain).connect(context.current.destination);
    oscillator.start();
    oscillator.stop(context.current.currentTime + duration);
  } catch { /* O sorteio continua normalmente se o navegador bloquear áudio. */ }
}

function playVictory(context: React.MutableRefObject<AudioContext | null>) {
  [523, 659, 784].forEach((frequency, index) => window.setTimeout(() => playTone(context, frequency, 0.35, 0.08), index * 120));
}
