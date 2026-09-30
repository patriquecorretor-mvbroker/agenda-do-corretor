import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, Clock3, Flame, History, ListChecks, Pause, Play, Quote, RotateCcw, Target, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useTasks } from "@/features/tasks/use-tasks";
import { cn } from "@/lib/utils";
import type { AppView } from "@/types/ui";

const durations = [15, 25, 45, 60];
const storageKey = "agenda-focus-session-v1";
const focusPhrases = [
  "O que recebe atenção consistente começa a crescer.",
  "Uma tarefa concluída vale mais que cinco iniciadas.",
  "Foco é dizer não ao ruído até terminar o que importa.",
  "A próxima venda também nasce de uma hora bem usada.",
  "Disciplina hoje, liberdade para escolher amanhã.",
  "Menos abas abertas. Mais resultado entregue.",
  "Faça primeiro o movimento que aproxima o fechamento."
];

type FocusHistoryItem = { taskId: string; taskTitle: string; durationMinutes: number; completedAt: string };

type FocusSession = {
  taskId: string;
  durationMinutes: number;
  secondsLeft: number;
  running: boolean;
  endsAt: number | null;
  completedSessions: number;
  history: FocusHistoryItem[];
};

const initialSession: FocusSession = { taskId: "", durationMinutes: 25, secondsLeft: 25 * 60, running: false, endsAt: null, completedSessions: 0, history: [] };

export function FocusPage({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const { tasks, updateTask } = useTasks();
  const { toast } = useToast();
  const [session, setSession] = useState<FocusSession>(readSession);
  const pendingTasks = useMemo(() => tasks.filter((task) => task.status === "pendente").sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === "alta" ? -1 : b.priority === "alta" ? 1 : 0;
    return `${a.due_date ?? "9999"} ${a.due_time ?? "99:99"}`.localeCompare(`${b.due_date ?? "9999"} ${b.due_time ?? "99:99"}`);
  }), [tasks]);
  const selectedTask = pendingTasks.find((task) => task.id === session.taskId);
  const progress = Math.min(100, Math.max(0, ((session.durationMinutes * 60 - session.secondsLeft) / (session.durationMinutes * 60)) * 100));
  const todayKey = new Date().toDateString();
  const todayHistory = session.history.filter((item) => new Date(item.completedAt).toDateString() === todayKey);
  const todayMinutes = todayHistory.reduce((total, item) => total + item.durationMinutes, 0);
  const phrase = focusPhrases[new Date().getDate() % focusPhrases.length];
  const minutes = String(Math.floor(session.secondsLeft / 60)).padStart(2, "0");
  const seconds = String(session.secondsLeft % 60).padStart(2, "0");

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(session)); }, [session]);
  useEffect(() => {
    if (!session.running || !session.endsAt) return;
    const tick = () => {
      const next = Math.max(0, Math.ceil((session.endsAt! - Date.now()) / 1000));
      if (next === 0) {
        setSession((current) => ({ ...current, secondsLeft: 0, running: false, endsAt: null, completedSessions: current.completedSessions + 1, history: [{ taskId: current.taskId, taskTitle: selectedTask?.title || "Sessão de foco", durationMinutes: current.durationMinutes, completedAt: new Date().toISOString() }, ...current.history].slice(0, 30) }));
        toast({ title: "Sessão concluída. Você ficou focado em uma única prioridade." });
      } else setSession((current) => ({ ...current, secondsLeft: next }));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [session.running, session.endsAt, selectedTask?.title, toast]);

  function chooseTask(taskId: string) { setSession((current) => ({ ...current, taskId, running: false, endsAt: null, secondsLeft: current.durationMinutes * 60 })); }
  function chooseDuration(durationMinutes: number) { setSession((current) => ({ ...current, durationMinutes, secondsLeft: durationMinutes * 60, running: false, endsAt: null })); }
  function toggle() {
    if (!selectedTask) { toast({ title: "Escolha uma tarefa antes de iniciar.", variant: "error" }); return; }
    setSession((current) => current.running
      ? { ...current, running: false, endsAt: null }
      : { ...current, running: true, endsAt: Date.now() + current.secondsLeft * 1000 });
  }
  function reset() { setSession((current) => ({ ...current, running: false, endsAt: null, secondsLeft: current.durationMinutes * 60 })); }
  async function completeTask() {
    if (!selectedTask) return;
    await updateTask.mutateAsync({ id: selectedTask.id, input: { status: "concluída" } });
    setSession((current) => ({ ...current, taskId: "", running: false, endsAt: null, secondsLeft: current.durationMinutes * 60 }));
    toast({ title: "Tarefa concluída e retirada da fila de foco." });
  }

  return <div className="mx-auto w-full max-w-[1400px] space-y-5">
    <header className="flex items-center gap-3"><Button type="button" size="icon" variant="outline" onClick={() => onNavigate("day")} aria-label="Voltar ao Meu Dia"><ChevronLeft className="h-4 w-4" /></Button><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Produtividade sem distrações</p><h1 className="mt-1 text-3xl font-semibold">Foco</h1></div></header>

    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_360px]">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-primary/20 bg-[#05080d] p-5 text-white shadow-[0_24px_70px_rgba(2,8,18,.22)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.2),transparent_34%)]" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Uma tarefa. Um tempo. Foco total.</p><h2 className="mt-2 max-w-2xl text-2xl font-semibold sm:text-3xl">{selectedTask?.title ?? "Escolha sua prioridade"}</h2>{selectedTask && <p className="mt-2 text-sm text-white/55">{selectedTask.priority === "alta" ? "Prioridade alta" : `Prioridade ${selectedTask.priority}`}{selectedTask.due_time ? ` · ${selectedTask.due_time.slice(0, 5)}` : ""}</p>}</div><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><TimerReset className="h-6 w-6" /></span></div>

          <div className="mx-auto my-8 grid h-64 w-64 place-items-center rounded-full p-3 sm:h-72 sm:w-72" style={{ background: `conic-gradient(hsl(var(--primary)) ${progress}%, rgba(255,255,255,.09) ${progress}% 100%)` }}><div className="grid h-full w-full place-items-center rounded-full border border-white/10 bg-[#080c12] text-center shadow-inner"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{session.running ? "Em foco" : session.secondsLeft === 0 ? "Concluído" : "Pronto"}</p><p className="mt-2 text-6xl font-semibold tabular-nums sm:text-7xl">{minutes}:{seconds}</p><p className="mt-3 text-xs text-white/42">Sessão {session.durationMinutes} min</p></div></div></div>

          <div className="mx-auto grid max-w-lg grid-cols-[1fr_auto] gap-2"><Button type="button" className="h-12" onClick={toggle} disabled={!selectedTask || session.secondsLeft === 0}>{session.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{session.running ? "Pausar" : "Iniciar foco"}</Button><Button type="button" size="icon" variant="outline" className="h-12 w-12 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={reset} aria-label="Reiniciar sessão"><RotateCcw className="h-4 w-4" /></Button></div>
          <Progress value={progress} className="mx-auto mt-5 max-w-lg bg-white/10" />
        </div>
      </div>

      <aside className="space-y-4">
        <section className="rounded-[1.5rem] border bg-card p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><ListChecks className="h-5 w-5" /></span><div><h2 className="font-semibold">Tarefa da sessão</h2><p className="text-xs text-muted-foreground">Somente uma pode ficar ativa.</p></div></div><div className="mt-4"><Select value={session.taskId} onValueChange={chooseTask} disabled={session.running}><SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder={pendingTasks.length ? "Selecionar tarefa" : "Nenhuma tarefa pendente"} /></SelectTrigger><SelectContent>{pendingTasks.map((task) => <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>)}</SelectContent></Select></div>{selectedTask && <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => void completeTask()} disabled={session.running}><CheckCircle2 className="h-4 w-4" />Marcar como concluída</Button>}</section>

        <section className="rounded-[1.5rem] border bg-card p-5 shadow-sm"><div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">Tempo de foco</h2><p className="text-xs text-muted-foreground">Escolha antes de iniciar.</p></div></div><div className="mt-4 grid grid-cols-4 gap-2">{durations.map((duration) => <button key={duration} type="button" disabled={session.running} onClick={() => chooseDuration(duration)} className={cn("min-h-12 rounded-xl border text-sm font-semibold transition", session.durationMinutes === duration ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary/40", session.running && "opacity-45")}>{duration}<span className="ml-0.5 text-[10px] opacity-65">min</span></button>)}</div></section>

        <section className="relative overflow-hidden rounded-[1.5rem] border border-primary/20 bg-card p-5"><Quote className="h-6 w-6 text-primary" /><p className="mt-4 text-lg font-semibold leading-7">“{phrase}”</p><p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Frase de foco do dia</p></section>
      </aside>
    </section>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><FocusMetric icon={Flame} label="Minutos hoje" value={todayMinutes} /><FocusMetric icon={Target} label="Sessões hoje" value={todayHistory.length} /><FocusMetric icon={CheckCircle2} label="Sessões totais" value={session.completedSessions} /><FocusMetric icon={ListChecks} label="Tarefas disponíveis" value={pendingTasks.length} /></section>

    <section className="rounded-[1.5rem] border bg-card p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><History className="h-5 w-5" /></span><div><h2 className="font-semibold">Histórico de foco</h2><p className="text-xs text-muted-foreground">Suas últimas sessões concluídas neste dispositivo.</p></div></div>{session.history.length ? <div className="mt-4 divide-y">{session.history.slice(0, 8).map((item, index) => <div key={`${item.completedAt}-${index}`} className="flex items-center gap-3 py-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.taskTitle}</p><p className="mt-0.5 text-xs text-muted-foreground">{new Date(item.completedAt).toLocaleDateString("pt-BR")} às {new Date(item.completedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p></div><span className="shrink-0 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-semibold">{item.durationMinutes} min</span></div>)}</div> : <div className="mt-4 rounded-2xl border border-dashed bg-muted/25 px-4 py-8 text-center text-sm text-muted-foreground">Conclua seu primeiro ciclo para começar o histórico.</div>}</section>
  </div>;
}

function FocusMetric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return <div className="rounded-2xl border bg-card p-4 shadow-sm"><Icon className="h-4 w-4 text-primary" /><p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p><p className="mt-0.5 text-xs text-muted-foreground">{label}</p></div>;
}

function readSession(): FocusSession {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null") as FocusSession | null;
    if (!saved) return initialSession;
    const normalized = { ...initialSession, ...saved, history: Array.isArray(saved.history) ? saved.history : [] };
    if (normalized.running && normalized.endsAt) return { ...normalized, secondsLeft: Math.max(0, Math.ceil((normalized.endsAt - Date.now()) / 1000)), running: normalized.endsAt > Date.now() };
    return normalized;
  } catch { return initialSession; }
}
