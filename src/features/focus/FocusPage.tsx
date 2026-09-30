import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Flame,
  ListChecks,
  MessageCircle,
  Pause,
  Phone,
  Play,
  RotateCcw,
  Send,
  Target,
  UserRoundCheck,
  UsersRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientAvatar } from "@/features/clients/ClientAvatar";
import { useClients } from "@/features/clients/use-clients";
import { useTasks } from "@/features/tasks/use-tasks";
import { cn } from "@/lib/utils";
import type { Client, ClientStatus, Task } from "@/types/database";
import type { AppView } from "@/types/ui";
import { useToast } from "@/components/ui/toast";

const durations = [15, 25, 45, 60];
const storageKey = "agenda-focus-session-v2";

type FocusMode = "calls" | "messages" | "followups" | "proposals" | "visits" | "custom";
type FocusHistoryItem = { taskId: string; taskTitle: string; durationMinutes: number; completedAt: string };
type FocusSession = {
  mode: FocusMode;
  taskId: string;
  durationMinutes: number;
  secondsLeft: number;
  running: boolean;
  endsAt: number | null;
  completedSessions: number;
  history: FocusHistoryItem[];
};

const focusModes: Array<{
  id: FocusMode;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
  statuses?: ClientStatus[];
}> = [
  { id: "calls", label: "Ligar para clientes", shortLabel: "Ligar", description: "Contato direto com a carteira ativa", icon: Phone },
  { id: "messages", label: "Mandar mensagens", shortLabel: "Mensagem", description: "WhatsApp para manter a conversa viva", icon: MessageCircle },
  { id: "followups", label: "Fazer follow-ups", shortLabel: "Follow-up", description: "Retornos vencidos e próximos primeiro", icon: UserRoundCheck },
  { id: "proposals", label: "Trabalhar propostas", shortLabel: "Propostas", description: "Clientes qualificados e em negociação", icon: Send, statuses: ["qualificado", "visita agendada", "proposta", "negociação"] },
  { id: "visits", label: "Agendar visitas", shortLabel: "Visitas", description: "Clientes prontos para conhecer imóveis", icon: CalendarClock, statuses: ["qualificado", "visita agendada", "em contato"] },
  { id: "custom", label: "Minha tarefa", shortLabel: "Tarefa", description: "Escolha uma pendência da agenda", icon: ListChecks }
];

const initialSession: FocusSession = {
  mode: "calls",
  taskId: "",
  durationMinutes: 25,
  secondsLeft: 25 * 60,
  running: false,
  endsAt: null,
  completedSessions: 0,
  history: []
};

export function FocusPage({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const { tasks, updateTask } = useTasks();
  const { clients, updateClient } = useClients();
  const { toast } = useToast();
  const [session, setSession] = useState<FocusSession>(readSession);
  const pendingTasks = useMemo(() => tasks.filter((task) => task.status === "pendente").sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === "alta" ? -1 : b.priority === "alta" ? 1 : 0;
    return `${a.due_date ?? "9999"} ${a.due_time ?? "99:99"}`.localeCompare(`${b.due_date ?? "9999"} ${b.due_time ?? "99:99"}`);
  }), [tasks]);
  const selectedMode = focusModes.find((mode) => mode.id === session.mode) ?? focusModes[0];
  const selectedTask = pendingTasks.find((task) => task.id === session.taskId);
  const activeTitle = session.mode === "custom" ? selectedTask?.title ?? "Escolha uma tarefa" : selectedMode.label;
  const relevantClients = useMemo(() => rankClients(clients, selectedMode.statuses, session.mode), [clients, selectedMode.statuses, session.mode]);
  const progress = Math.min(100, Math.max(0, ((session.durationMinutes * 60 - session.secondsLeft) / (session.durationMinutes * 60)) * 100));
  const todayKey = new Date().toDateString();
  const todayHistory = session.history.filter((item) => new Date(item.completedAt).toDateString() === todayKey);
  const todayMinutes = todayHistory.reduce((total, item) => total + item.durationMinutes, 0);
  const minutes = String(Math.floor(session.secondsLeft / 60)).padStart(2, "0");
  const seconds = String(session.secondsLeft % 60).padStart(2, "0");

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(session)); }, [session]);
  useEffect(() => {
    if (!session.running || !session.endsAt) return;
    const tick = () => {
      const next = Math.max(0, Math.ceil((session.endsAt! - Date.now()) / 1000));
      if (next === 0) {
        setSession((current) => ({
          ...current,
          secondsLeft: 0,
          running: false,
          endsAt: null,
          completedSessions: current.completedSessions + 1,
          history: [{ taskId: current.taskId || current.mode, taskTitle: activeTitle, durationMinutes: current.durationMinutes, completedAt: new Date().toISOString() }, ...current.history].slice(0, 30)
        }));
        toast({ title: "Ciclo concluído. Bom trabalho." });
      } else setSession((current) => ({ ...current, secondsLeft: next }));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [session.running, session.endsAt, activeTitle, toast]);

  function chooseMode(mode: FocusMode) {
    setSession((current) => ({ ...current, mode, taskId: mode === "custom" ? current.taskId : "", running: false, endsAt: null, secondsLeft: current.durationMinutes * 60 }));
  }
  function chooseTask(taskId: string) { setSession((current) => ({ ...current, taskId, running: false, endsAt: null, secondsLeft: current.durationMinutes * 60 })); }
  function chooseDuration(durationMinutes: number) { setSession((current) => ({ ...current, durationMinutes, secondsLeft: durationMinutes * 60, running: false, endsAt: null })); }
  function toggle() {
    if (session.mode === "custom" && !selectedTask) { toast({ title: "Escolha uma tarefa antes de iniciar.", variant: "error" }); return; }
    setSession((current) => current.running
      ? { ...current, running: false, endsAt: null }
      : { ...current, running: true, endsAt: Date.now() + current.secondsLeft * 1000 });
  }
  function reset() { setSession((current) => ({ ...current, running: false, endsAt: null, secondsLeft: current.durationMinutes * 60 })); }
  async function completeTask() {
    if (!selectedTask) return;
    await updateTask.mutateAsync({ id: selectedTask.id, input: { status: "concluída" } });
    setSession((current) => ({ ...current, taskId: "", running: false, endsAt: null, secondsLeft: current.durationMinutes * 60 }));
    toast({ title: "Tarefa concluída e retirada da fila." });
  }
  async function markProposal(client: Client) {
    await updateClient.mutateAsync({ id: client.id, input: { status: "proposta" }, previousStatus: client.status });
    toast({ title: `${client.name} movido para proposta.` });
  }

  const canStart = session.mode !== "custom" || Boolean(selectedTask);

  return <div className="-mx-3 -my-3 min-h-[calc(100vh-5.5rem)] overflow-hidden bg-[#05070a] px-3 pb-28 pt-4 text-white sm:-mx-5 sm:-my-5 sm:px-5 sm:pt-5 lg:-mx-5 lg:-my-6 lg:min-h-[calc(100vh-4.75rem)] lg:px-5 lg:pb-8 lg:pt-6 xl:-mx-7 xl:px-7 2xl:-mx-8 2xl:px-8">
    <div className="mx-auto w-full max-w-[1560px] space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><Button type="button" size="icon" variant="outline" className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white" onClick={() => onNavigate("day")} aria-label="Voltar ao Meu Dia"><ChevronLeft className="h-4 w-4" /></Button><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Modo de execução</p><h1 className="mt-0.5 text-xl font-semibold sm:text-2xl">Foco</h1></div></div>
        <div className="hidden items-center gap-5 text-xs text-white/45 sm:flex"><span><strong className="mr-1.5 text-white">{todayMinutes}</strong>min hoje</span><span><strong className="mr-1.5 text-white">{todayHistory.length}</strong>ciclos</span></div>
      </header>

      <section className="relative min-h-[510px] overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#090c11] shadow-[0_28px_90px_rgba(0,0,0,.42)] sm:min-h-[560px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,hsl(var(--primary)/0.16),transparent_38%)]" />
        <div className="relative flex min-h-[510px] flex-col px-4 py-5 sm:min-h-[560px] sm:px-8 sm:py-7">
          <div className="mx-auto flex max-w-full gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {focusModes.map((mode) => <button key={mode.id} type="button" disabled={session.running} onClick={() => chooseMode(mode.id)} className={cn("inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition", session.mode === mode.id ? "border-primary/70 bg-primary text-primary-foreground shadow-[0_0_26px_hsl(var(--primary)/.2)]" : "border-white/10 bg-white/[0.025] text-white/55 hover:border-white/20 hover:text-white", session.running && session.mode !== mode.id && "opacity-30")}><mode.icon className="h-3.5 w-3.5" />{mode.shortLabel}</button>)}
          </div>

          <div className="mt-4 text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/32">Atividade selecionada</p><h2 className="mt-2 truncate text-lg font-semibold sm:text-2xl">{activeTitle}</h2><p className="mt-1 text-xs text-white/38">{session.mode === "custom" && selectedTask ? `${selectedTask.priority === "alta" ? "Alta prioridade" : `Prioridade ${selectedTask.priority}`}${selectedTask.due_time ? ` · ${selectedTask.due_time.slice(0, 5)}` : ""}` : selectedMode.description}</p></div>

          {session.mode === "custom" && <div className="mx-auto mt-4 w-full max-w-xl"><label className="sr-only" htmlFor="focus-task">Tarefa da sessão</label><select id="focus-task" value={session.taskId} onChange={(event) => chooseTask(event.target.value)} disabled={session.running} className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none focus:border-primary/60"><option value="" className="bg-[#11151b]">Selecionar tarefa da agenda</option>{pendingTasks.map((task) => <option key={task.id} value={task.id} className="bg-[#11151b]">{task.title}</option>)}</select></div>}

          <div className="flex flex-1 items-center justify-center py-5">
            <div className="grid aspect-square w-[min(72vw,350px)] place-items-center rounded-full p-[5px] sm:w-[360px]" style={{ background: `conic-gradient(hsl(var(--primary)) ${progress}%, rgba(255,255,255,.07) ${progress}% 100%)` }}>
              <div className="grid h-full w-full place-items-center rounded-full border border-white/[0.08] bg-[#07090d] text-center shadow-[inset_0_0_80px_rgba(255,255,255,.025)]"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/32">{session.running ? "Foco ativo" : session.secondsLeft === 0 ? "Concluído" : "Pronto"}</p><p className="mt-3 text-[clamp(4.25rem,11vw,7.5rem)] font-semibold leading-none tabular-nums tracking-[0.01em]">{minutes}:{seconds}</p><p className="mt-4 text-xs text-white/35">{session.durationMinutes} minutos sem distrações</p></div></div>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-xl items-center gap-2">
            <div className="grid flex-1 grid-cols-4 gap-1.5">{durations.map((duration) => <button key={duration} type="button" disabled={session.running} onClick={() => chooseDuration(duration)} className={cn("h-11 rounded-xl border text-xs font-semibold transition", session.durationMinutes === duration ? "border-white/25 bg-white text-black" : "border-white/[0.08] bg-white/[0.025] text-white/45 hover:text-white", session.running && "opacity-35")}>{duration} min</button>)}</div>
            <Button type="button" className="h-11 min-w-28 rounded-xl" onClick={toggle} disabled={!canStart || session.secondsLeft === 0}>{session.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{session.running ? "Pausar" : "Iniciar"}</Button>
            <Button type="button" size="icon" variant="outline" className="h-11 w-11 shrink-0 border-white/10 bg-white/[0.025] text-white hover:bg-white/[0.08] hover:text-white" onClick={reset} aria-label="Reiniciar sessão"><RotateCcw className="h-4 w-4" /></Button>
          </div>
        </div>
      </section>

      {session.mode === "custom" ? <CustomTaskPanel selectedTask={selectedTask} pendingCount={pendingTasks.length} running={session.running} onComplete={() => void completeTask()} /> : <section className="rounded-[1.5rem] border border-white/[0.07] bg-[#090c11] p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Fila da atividade</p><h2 className="mt-1 text-lg font-semibold">Clientes para {selectedMode.shortLabel.toLocaleLowerCase("pt-BR")}</h2><p className="mt-1 text-xs text-white/38">Mais urgentes e mais quentes aparecem primeiro.</p></div><span className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/55">{relevantClients.length}</span></div>
        {relevantClients.length ? <div className="mt-4 grid gap-2 xl:grid-cols-2">{relevantClients.slice(0, 12).map((client, index) => <FocusClientRow key={client.id} client={client} rank={index + 1} mode={session.mode} onOpenClients={() => onNavigate("clients")} onProposal={() => void markProposal(client)} />)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center"><UsersRound className="mx-auto h-6 w-6 text-white/25" /><p className="mt-3 text-sm font-semibold">Nenhum cliente nesta fila</p><p className="mt-1 text-xs text-white/35">Atualize a etapa dos clientes para montar esta sequência.</p><Button type="button" variant="outline" className="mt-4 border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white" onClick={() => onNavigate("clients")}>Abrir clientes</Button></div>}
      </section>}

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4"><FocusMetric icon={Flame} label="Minutos hoje" value={todayMinutes} /><FocusMetric icon={Target} label="Ciclos hoje" value={todayHistory.length} /><FocusMetric icon={CheckCircle2} label="Ciclos totais" value={session.completedSessions} /><FocusMetric icon={Clock3} label="Duração atual" value={session.durationMinutes} suffix="min" /></section>
    </div>
  </div>;
}

function FocusClientRow({ client, rank, mode, onOpenClients, onProposal }: { client: Client; rank: number; mode: FocusMode; onOpenClients: () => void; onProposal: () => void }) {
  const phone = client.phone || client.whatsapp;
  const digits = client.whatsapp?.replace(/\D/g, "");
  const firstName = client.name.split(" ")[0];
  const message = mode === "proposals" ? `Olá, ${firstName}! Separei a proposta para conversarmos.` : mode === "visits" ? `Olá, ${firstName}! Vamos combinar a melhor data para sua visita?` : `Olá, ${firstName}! Tudo bem? Estou entrando em contato para dar continuidade ao seu atendimento.`;
  const due = followUpLabel(client.next_follow_up);
  return <article className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 transition hover:border-white/15 hover:bg-white/[0.045]">
    <span className="w-5 shrink-0 text-center text-[10px] font-semibold text-white/25">{String(rank).padStart(2, "0")}</span>
    <span className="h-10 w-10 shrink-0"><ClientAvatar name={client.name} /></span>
    <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpenClients}><span className="block truncate text-sm font-semibold">{client.name}</span><span className="mt-0.5 block truncate text-[11px] text-white/38">{client.property_profile || "Perfil não informado"}{client.city ? ` · ${client.city}` : ""}</span></button>
    <div className="hidden min-w-24 text-right sm:block"><p className={cn("text-[10px] font-semibold", due.urgent ? "text-primary" : "text-white/42")}>{due.label}</p><p className="mt-0.5 text-[10px] capitalize text-white/28">{client.temperature || "sem temperatura"}</p></div>
    <div className="flex shrink-0 gap-1">
      {phone ? <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] text-white/58 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white" aria-label={`Ligar para ${client.name}`}><Phone className="h-4 w-4" /></a> : null}
      {digits ? <a href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] text-emerald-400 transition hover:border-emerald-400/30 hover:bg-emerald-400/10" aria-label={`Enviar WhatsApp para ${client.name}`}><MessageCircle className="h-4 w-4" /></a> : null}
      {mode === "proposals" && client.status !== "proposta" ? <button type="button" onClick={onProposal} className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] text-primary transition hover:border-primary/30 hover:bg-primary/10" aria-label={`Mover ${client.name} para proposta`}><Send className="h-4 w-4" /></button> : null}
    </div>
  </article>;
}

function CustomTaskPanel({ selectedTask, pendingCount, running, onComplete }: { selectedTask: Task | undefined; pendingCount: number; running: boolean; onComplete: () => void }) {
  return <section className="rounded-[1.5rem] border border-white/[0.07] bg-[#090c11] p-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.035] text-primary"><ListChecks className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Tarefa em foco</p><h2 className="mt-1 truncate text-lg font-semibold">{selectedTask?.title ?? "Selecione uma tarefa acima"}</h2><p className="mt-1 text-xs text-white/35">{pendingCount} tarefas pendentes na agenda</p></div>{selectedTask && <Button type="button" variant="outline" className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white" onClick={onComplete} disabled={running}><Check className="h-4 w-4" />Concluir</Button>}</div></section>;
}

function FocusMetric({ icon: Icon, label, value, suffix }: { icon: React.ElementType; label: string; value: number; suffix?: string }) {
  return <div className="rounded-2xl border border-white/[0.07] bg-[#090c11] p-4"><Icon className="h-4 w-4 text-primary" /><p className="mt-3 text-2xl font-semibold tabular-nums">{value}<span className="ml-1 text-xs font-medium text-white/32">{suffix}</span></p><p className="mt-0.5 text-xs text-white/35">{label}</p></div>;
}

function rankClients(clients: Client[], statuses: ClientStatus[] | undefined, mode: FocusMode) {
  const active = clients.filter((client) => client.status !== "perdido" && !["venda realizada", "pós-venda"].includes(client.status));
  const filtered = statuses ? active.filter((client) => statuses.includes(client.status)) : active;
  return [...filtered].sort((a, b) => clientScore(b, mode) - clientScore(a, mode) || (a.next_follow_up ?? "9999").localeCompare(b.next_follow_up ?? "9999"));
}

function clientScore(client: Client, mode: FocusMode) {
  let score = client.temperature === "quente" ? 35 : client.temperature === "morno" ? 15 : 0;
  if (client.next_follow_up) {
    const days = Math.ceil((new Date(`${client.next_follow_up}T12:00:00`).getTime() - Date.now()) / 86400000);
    if (days < 0) score += 60;
    else if (days === 0) score += 50;
    else if (days <= 2) score += 25;
  }
  if (mode === "proposals" && ["proposta", "negociação"].includes(client.status)) score += 40;
  if (mode === "visits" && client.status === "visita agendada") score += 35;
  return score;
}

function followUpLabel(value: string | null) {
  if (!value) return { label: "Sem retorno", urgent: false };
  const today = new Date().toISOString().slice(0, 10);
  const days = Math.ceil((new Date(`${value}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)}d atrasado`, urgent: true };
  if (days === 0) return { label: "Retorno hoje", urgent: true };
  if (days === 1) return { label: "Retorno amanhã", urgent: false };
  return { label: `Retorno em ${days}d`, urgent: false };
}

function readSession(): FocusSession {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null") as Partial<FocusSession> | null;
    if (!saved) return initialSession;
    const validMode = focusModes.some((mode) => mode.id === saved.mode) ? saved.mode as FocusMode : "calls";
    const normalized: FocusSession = { ...initialSession, ...saved, mode: validMode, history: Array.isArray(saved.history) ? saved.history : [] };
    if (normalized.running && normalized.endsAt) return { ...normalized, secondsLeft: Math.max(0, Math.ceil((normalized.endsAt - Date.now()) / 1000)), running: normalized.endsAt > Date.now() };
    return normalized;
  } catch { return initialSession; }
}
