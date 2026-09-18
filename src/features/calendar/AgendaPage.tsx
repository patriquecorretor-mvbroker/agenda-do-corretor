import { useMemo, useState } from "react";
import { format, isBefore, isToday, parseISO } from "date-fns";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Edit3,
  Flame,
  MapPin,
  MoreHorizontal,
  StickyNote,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { EventForm } from "@/features/calendar/EventForm";
import { useEvents } from "@/features/calendar/use-events";
import { useTasks } from "@/features/tasks/use-tasks";
import { TaskForm } from "@/features/tasks/TaskForm";
import { cn, clampPercent } from "@/lib/utils";
import type { CalendarEvent, Task } from "@/types/database";

export function AgendaPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { events, updateEvent, deleteEvent } = useEvents(today);
  const { tasks, updateTask, deleteTask } = useTasks();
  const { toast } = useToast();
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [notesEvent, setNotesEvent] = useState<CalendarEvent | null>(null);
  const [rescheduleEvent, setRescheduleEvent] = useState<CalendarEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "event" | "task"; id: string } | null>(null);

  const sortedEvents = useMemo(
    () => events.slice().sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [events]
  );

  const agendaStats = useMemo(() => {
    const completed = events.filter((event) => event.status === "concluído").length;
    const pending = events.filter((event) => event.status === "agendado").length;
    const delayed = events.filter((event) => event.status === "agendado" && event.start_time < format(new Date(), "HH:mm")).length;
    const progress = events.length ? clampPercent((completed / events.length) * 100) : 0;
    return { completed, pending, delayed, progress };
  }, [events]);

  const todayTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.due_date && isToday(parseISO(task.due_date)))
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === "pendente" ? -1 : 1;
          if (a.priority !== b.priority) return a.priority === "alta" ? -1 : 1;
          return (a.due_time ?? "99:99").localeCompare(b.due_time ?? "99:99");
        }),
    [tasks]
  );

  const focusTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status === "pendente")
        .filter((task) => {
          if (!task.due_date) return task.priority === "alta";
          const dueDate = parseISO(task.due_date);
          return isBefore(dueDate, new Date()) || isToday(dueDate) || task.priority === "alta";
        })
        .sort((a, b) => {
          const aOverdue = a.due_date ? isBefore(parseISO(a.due_date), new Date()) && !isToday(parseISO(a.due_date)) : false;
          const bOverdue = b.due_date ? isBefore(parseISO(b.due_date), new Date()) && !isToday(parseISO(b.due_date)) : false;
          if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
          if (a.priority !== b.priority) return a.priority === "alta" ? -1 : 1;
          return (a.due_time ?? "99:99").localeCompare(b.due_time ?? "99:99");
        }),
    [tasks]
  );

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "event") await deleteEvent.mutateAsync(deleteTarget.id);
      else await deleteTask.mutateAsync(deleteTarget.id);
      toast({ title: "Item excluído." });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Não foi possível excluir.", variant: "error" });
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] bg-[#050403] text-white shadow-soft">
        <div className="relative p-5 md:p-8">
          <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary/35 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
                <img src="/brand/mv-broker-logo.jpg" alt="" className="h-5 w-5 rounded-full object-cover" />
                Agenda operacional
              </div>
              <h1 className="max-w-2xl text-3xl font-semibold leading-tight md:text-5xl">Sua rotina do dia, sem ruído.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/62">
                Compromissos em linha do tempo, tarefas prioritárias e ações rápidas para tocar o dia com uma mão.
              </p>
            </div>
            <div className="min-w-60 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
              <div className="flex items-center justify-between text-sm text-white/62">
                <span>Progresso da agenda</span>
                <span>{agendaStats.progress}%</span>
              </div>
              <Progress value={agendaStats.progress} className="mt-3 bg-white/10" />
              <p className="mt-3 text-xs text-white/55">
                {agendaStats.completed} concluídos de {events.length || 0} compromissos.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Compromissos" value={events.length} helper="na agenda de hoje" />
        <MetricCard label="Concluídos" value={agendaStats.completed} helper="já resolvidos" />
        <MetricCard label="Pendentes" value={agendaStats.pending} helper="ainda em aberto" />
        <MetricCard label="Atrasados" value={agendaStats.delayed} helper="pedem atenção" tone={agendaStats.delayed ? "hot" : "normal"} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <Card className="overflow-hidden border-black/5 dark:border-white/10">
          <CardHeader className="border-b bg-white/70 dark:bg-white/[0.03]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Linha do tempo</CardTitle>
                <CardDescription>Toque em concluir, reagende ou registre uma observação sem sair da agenda.</CardDescription>
              </div>
              <div className="hidden rounded-2xl bg-[#050403] px-4 py-3 text-right text-white sm:block">
                <p className="text-xs text-white/55">Hoje</p>
                <p className="font-semibold">{format(new Date(), "dd/MM")}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {sortedEvents.length ? (
              sortedEvents.map((event, index) => (
                <TimelineEvent
                  key={event.id}
                  event={event}
                  isLast={index === sortedEvents.length - 1}
                  onToggle={() =>
                    updateEvent.mutate({
                      id: event.id,
                      input: { status: event.status === "concluído" ? "agendado" : "concluído" }
                    })
                  }
                  onEdit={() => setEditingEvent(event)}
                  onReschedule={() => setRescheduleEvent(event)}
                  onNotes={() => setNotesEvent(event)}
                  onDelete={() => setDeleteTarget({ type: "event", id: event.id })}
                />
              ))
            ) : (
              <Empty text="Nenhum compromisso cadastrado para hoje. Use o botão + para criar a primeira ação do dia." />
            )}
          </CardContent>
        </Card>

        <aside className="space-y-5">
          <Card className="border-primary/20 bg-primary text-white">
            <CardHeader>
              <CardTitle>Foco agora</CardTitle>
              <CardDescription className="text-white/70">Vencidas, alta prioridade e tarefas de hoje.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {focusTasks.length ? (
                focusTasks.slice(0, 5).map((task) => (
                  <FocusTask key={task.id} task={task} onDone={() => updateTask.mutate({ id: task.id, input: { status: "concluída" } })} />
                ))
              ) : (
                <div className="rounded-2xl border border-white/20 p-4 text-sm text-white/75">Nenhuma prioridade crítica agora.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tarefas de hoje</CardTitle>
              <CardDescription>Lista compacta para operar rápido no celular.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayTasks.length ? (
                todayTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() =>
                      updateTask.mutate({
                        id: task.id,
                        input: { status: task.status === "concluída" ? "pendente" : "concluída" }
                      })
                    }
                    onEdit={() => setEditingTask(task)}
                    onDelete={() => setDeleteTarget({ type: "task", id: task.id })}
                  />
                ))
              ) : (
                <Empty text="Nenhuma tarefa para hoje." compact />
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={Boolean(editingEvent)} onOpenChange={() => setEditingEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar compromisso</DialogTitle>
          </DialogHeader>
          {editingEvent && <EventForm event={editingEvent} onSaved={() => setEditingEvent(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingTask)} onOpenChange={() => setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar tarefa</DialogTitle>
          </DialogHeader>
          {editingTask && <TaskForm task={editingTask} onSaved={() => setEditingTask(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(notesEvent)} onOpenChange={() => setNotesEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observação do compromisso</DialogTitle>
            <DialogDescription>{notesEvent?.title}</DialogDescription>
          </DialogHeader>
          {notesEvent && (
            <form
              className="grid gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const notes = String(new FormData(event.currentTarget).get("notes") || "");
                await updateEvent.mutateAsync({ id: notesEvent.id, input: { notes } });
                toast({ title: "Observação salva." });
                setNotesEvent(null);
              }}
            >
              <Textarea name="notes" defaultValue={notesEvent.notes ?? ""} placeholder="Ex.: cliente pediu simulação com entrada menor." />
              <Button>Salvar observação</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rescheduleEvent)} onOpenChange={() => setRescheduleEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reagendar compromisso</DialogTitle>
            <DialogDescription>{rescheduleEvent?.title}</DialogDescription>
          </DialogHeader>
          {rescheduleEvent && (
            <form
              className="grid gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                await updateEvent.mutateAsync({
                  id: rescheduleEvent.id,
                  input: { date: String(form.get("date")), start_time: String(form.get("start_time")) }
                });
                toast({ title: "Compromisso reagendado." });
                setRescheduleEvent(null);
              }}
            >
              <div className="space-y-2">
                <Label>Nova data</Label>
                <Input name="date" type="date" defaultValue={rescheduleEvent.date} />
              </div>
              <div className="space-y-2">
                <Label>Novo horário</Label>
                <Input name="start_time" type="time" defaultValue={rescheduleEvent.start_time.slice(0, 5)} />
              </div>
              <Button>Reagendar</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={() => setDeleteTarget(null)}
        title="Excluir item?"
        description="Essa ação remove o registro da sua agenda."
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone = "normal"
}: {
  label: string;
  value: number;
  helper: string;
  tone?: "normal" | "hot";
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border bg-card p-4 shadow-sm",
        tone === "hot" && "border-primary/35 bg-primary/10"
      )}
    >
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function TimelineEvent({
  event,
  isLast,
  onToggle,
  onEdit,
  onReschedule,
  onNotes,
  onDelete
}: {
  event: CalendarEvent;
  isLast: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onReschedule: () => void;
  onNotes: () => void;
  onDelete: () => void;
}) {
  const completed = event.status === "concluído";
  return (
    <article className="grid grid-cols-[76px_1fr] gap-3 px-4 py-4 sm:grid-cols-[92px_1fr] sm:px-5">
      <div className="relative text-right">
        <p className={cn("font-semibold", completed ? "text-muted-foreground" : "text-[#050403] dark:text-white")}>
          {event.start_time.slice(0, 5)}
        </p>
        {event.end_time && <p className="text-xs text-muted-foreground">{event.end_time.slice(0, 5)}</p>}
        {!isLast && <div className="absolute right-[-18px] top-9 h-[calc(100%+1rem)] w-px bg-border sm:right-[-22px]" />}
        <div
          className={cn(
            "absolute right-[-25px] top-2 grid h-4 w-4 place-items-center rounded-full border-2 sm:right-[-29px]",
            completed ? "border-primary bg-primary" : "border-[#050403] bg-background dark:border-white"
          )}
        />
      </div>

      <div className={cn("rounded-3xl border bg-card p-4 shadow-sm transition", completed && "opacity-75")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">{event.type}</span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{event.status}</span>
            </div>
            <h3 className={cn("text-base font-semibold", completed && "line-through decoration-primary/70")}>{event.title}</h3>
            {event.description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{event.description}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                <MapPin className="h-3.5 w-3.5" />
                {event.location ?? "Local não informado"}
              </span>
              {event.notes && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                  <StickyNote className="h-3.5 w-3.5" />
                  Com observação
                </span>
              )}
            </div>
          </div>
          <Button size="sm" className="shrink-0" variant={completed ? "secondary" : "default"} onClick={onToggle}>
            <Check className="h-4 w-4" />
            {completed ? "Reabrir" : "Concluir"}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Edit3 className="h-4 w-4" />
            Editar
          </Button>
          <Button size="sm" variant="outline" onClick={onReschedule}>
            <MoreHorizontal className="h-4 w-4" />
            Reagendar
          </Button>
          <Button size="sm" variant="outline" onClick={onNotes}>
            <StickyNote className="h-4 w-4" />
            Nota
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>
      </div>
    </article>
  );
}

function FocusTask({ task, onDone }: { task: Task; onDone: () => void }) {
  const overdue = task.due_date ? isBefore(parseISO(task.due_date), new Date()) && !isToday(parseISO(task.due_date)) : false;
  return (
    <button
      type="button"
      onClick={onDone}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 text-left transition hover:bg-white/15"
    >
      <span>
        <span className="block text-sm font-semibold">{task.title}</span>
        <span className="mt-1 flex items-center gap-1 text-xs text-white/62">
          <Clock3 className="h-3.5 w-3.5" />
          {overdue ? "Atrasada" : task.due_time?.slice(0, 5) ?? "Sem horário"} • {task.priority}
        </span>
      </span>
      <CheckCircle2 className="h-5 w-5 shrink-0 text-white/70" />
    </button>
  );
}

function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete
}: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const completed = task.status === "concluída";
  return (
    <article className={cn("rounded-3xl border p-4 transition", completed && "bg-muted/50 opacity-75")}>
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onToggle} className="flex min-w-0 gap-3 text-left">
          <span
            className={cn(
              "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border",
              completed ? "border-primary bg-primary text-white" : "border-border"
            )}
          >
            {completed && <Check className="h-3.5 w-3.5" />}
          </span>
          <span>
            <span className={cn("block font-semibold", completed && "line-through")}>{task.title}</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {task.due_time?.slice(0, 5) ?? "sem horário"} • prioridade {task.priority}
            </span>
          </span>
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Edit3 className="h-4 w-4" />
          Editar
        </Button>
        <Button size="sm" variant="destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </div>
    </article>
  );
}

function Empty({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={cn("rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground", compact && "p-5")}>
      {text}
    </div>
  );
}
