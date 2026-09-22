import { useMemo, useState } from "react";
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isBefore, isSameDay, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Clock3,
  Edit3,
  MapPin,
  MoreHorizontal,
  Sparkles,
  StickyNote,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { EventForm } from "@/features/calendar/EventForm";
import { useEvents } from "@/features/calendar/use-events";
import { useTasks } from "@/features/tasks/use-tasks";
import { TaskForm } from "@/features/tasks/TaskForm";
import { useProfile } from "@/features/profile/use-profile";
import { DailyArtDialog } from "./DailyArtDialog";
import { getSpecialDate, getUpcomingSpecialDate } from "./special-dates";
import { cn, clampPercent } from "@/lib/utils";
import type { CalendarEvent, Task } from "@/types/database";

export function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">("day");
  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const periodStart = calendarView === "month" ? startOfMonth(selectedDate) : calendarView === "week" ? startOfWeek(selectedDate, { weekStartsOn: 1 }) : selectedDate;
  const periodEnd = calendarView === "month" ? endOfMonth(selectedDate) : calendarView === "week" ? endOfWeek(selectedDate, { weekStartsOn: 1 }) : selectedDate;
  const { events, updateEvent, deleteEvent } = useEvents({ from: format(periodStart, "yyyy-MM-dd"), to: format(periodEnd, "yyyy-MM-dd") });
  const { tasks, updateTask, deleteTask } = useTasks();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [notesEvent, setNotesEvent] = useState<CalendarEvent | null>(null);
  const [rescheduleEvent, setRescheduleEvent] = useState<CalendarEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "event" | "task"; id: string } | null>(null);
  const [artOpen, setArtOpen] = useState(false);
  const specialDate = getSpecialDate(selectedDate);
  const upcomingSpecial = getUpcomingSpecialDate(selectedDate);

  const sortedEvents = useMemo(
    () => events.slice().sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [events]
  );

  const agendaStats = useMemo(() => {
    const completed = events.filter((event) => event.status === "concluído").length;
    const pending = events.filter((event) => event.status === "agendado").length;
    const now = new Date();
    const todayKey = format(now, "yyyy-MM-dd");
    const delayed = events.filter((event) => event.status === "agendado" && (event.date < todayKey || (event.date === todayKey && event.start_time < format(now, "HH:mm")))).length;
    const progress = events.length ? clampPercent((completed / events.length) * 100) : 0;
    return { completed, pending, delayed, progress };
  }, [events]);

  const todayTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.due_date === selectedKey)
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === "pendente" ? -1 : 1;
          if (a.priority !== b.priority) return a.priority === "alta" ? -1 : 1;
          return (a.due_time ?? "99:99").localeCompare(b.due_time ?? "99:99");
        }),
    [tasks, selectedKey]
  );

  function movePeriod(direction: -1 | 1) {
    setSelectedDate((current) => calendarView === "month" ? addMonths(current, direction) : calendarView === "week" ? addWeeks(current, direction) : addDays(current, direction));
  }

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
      <section className="sticky top-0 z-20 -mx-3 border-b bg-background/95 px-3 pb-3 pt-1 shadow-sm backdrop-blur-xl sm:-mx-5 sm:px-5 lg:top-16 lg:-mx-6 lg:px-6 xl:-mx-8 xl:px-8 2xl:-mx-10 2xl:px-10">
        <div className="flex w-full flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Agenda</p>
              <h1 className="truncate text-lg font-semibold capitalize sm:text-xl">{periodLabel(selectedDate, calendarView)}</h1>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" aria-label="Período anterior" onClick={() => movePeriod(-1)}><ChevronLeft className="h-5 w-5" /></Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedDate(new Date())}>Hoje</Button>
              <Button size="icon" variant="ghost" aria-label="Próximo período" onClick={() => movePeriod(1)}><ChevronRight className="h-5 w-5" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-3 rounded-xl bg-muted p-1" aria-label="Visualização da agenda">
            {(["day", "week", "month"] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => setCalendarView(mode)} className={cn("min-h-10 rounded-lg px-3 text-sm font-semibold transition", calendarView === mode ? "bg-background text-primary shadow-sm" : "text-muted-foreground")}>
                {mode === "day" ? "Dia" : mode === "week" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
          <WeekStrip selectedDate={selectedDate} onSelect={setSelectedDate} events={events} />
        </div>
      </section>

      {(specialDate || upcomingSpecial) && (() => {
        const item = specialDate ? { date: selectedDate, special: specialDate } : upcomingSpecial!;
        return <section className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-[linear-gradient(135deg,_hsl(var(--primary)/0.14),_transparent)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3"><CalendarRange className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="text-xs font-semibold uppercase text-primary">{specialDate ? item.special.kind : `Próxima data · ${format(item.date, "dd/MM")}`}</p><h2 className="font-semibold">{item.special.title}</h2><p className="mt-1 text-sm text-muted-foreground">{item.special.message}</p></div></div>
          <Button variant="outline" className="shrink-0" onClick={() => { if (!specialDate) setSelectedDate(item.date); setArtOpen(true); }}><Sparkles className="h-4 w-4" />Criar arte</Button>
        </section>;
      })()}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Compromissos" value={events.length} helper={calendarView === "day" ? "neste dia" : "neste período"} />
        <MetricCard label="Concluídos" value={agendaStats.completed} helper="já resolvidos" />
        <MetricCard label="Pendentes" value={agendaStats.pending} helper="ainda em aberto" />
        <MetricCard label="Atrasados" value={agendaStats.delayed} helper="pedem atenção" tone={agendaStats.delayed ? "hot" : "normal"} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <Card className="overflow-hidden border-black/5 dark:border-white/10">
          <CardHeader className="border-b bg-white/70 dark:bg-white/[0.03]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{calendarView === "day" ? "Linha do tempo" : calendarView === "week" ? "Visão da semana" : "Calendário mensal"}</CardTitle>
                <CardDescription>{calendarView === "day" ? "Conclua, reagende ou registre uma observação sem sair da agenda." : "Toque em um dia para abrir sua linha do tempo."}</CardDescription>
              </div>
              <div className="hidden rounded-2xl bg-[linear-gradient(135deg,_#050403,_hsl(var(--primary)/0.72))] px-4 py-3 text-right text-white shadow-[0_16px_36px_hsl(var(--primary)/0.20)] sm:block">
                <p className="text-xs text-white/55">Selecionado</p>
                <p className="font-semibold">{format(selectedDate, "dd/MM")}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {calendarView !== "day" ? (
              <PeriodCalendar view={calendarView} selectedDate={selectedDate} events={events} onSelect={(date) => { setSelectedDate(date); setCalendarView("day"); }} />
            ) : sortedEvents.length ? (
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
              <Empty text="Nenhum compromisso cadastrado para este dia. Use o botão + para criar a primeira ação." />
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
              <CardTitle>Tarefas do dia</CardTitle>
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
                <Empty text="Nenhuma tarefa para esta data." compact />
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
      {specialDate && <DailyArtDialog open={artOpen} onOpenChange={setArtOpen} special={specialDate} date={selectedDate} profile={profile} />}
    </div>
  );
}

function periodLabel(date: Date, view: "day" | "week" | "month") {
  if (view === "day") return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  if (view === "month") return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return `${format(start, "dd MMM", { locale: ptBR })} - ${format(end, "dd MMM", { locale: ptBR })}`;
}

function WeekStrip({ selectedDate, onSelect, events }: { selectedDate: Date; onSelect: (date: Date) => void; events: CalendarEvent[] }) {
  const days = eachDayOfInterval({ start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) });
  return <div className="grid grid-cols-7 gap-1">
    {days.map((day) => {
      const count = events.filter((event) => event.date === format(day, "yyyy-MM-dd")).length;
      return <button key={day.toISOString()} type="button" onClick={() => onSelect(day)} className={cn("relative grid min-h-14 place-items-center rounded-xl px-1 text-center transition", isSameDay(day, selectedDate) ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted", isToday(day) && !isSameDay(day, selectedDate) && "ring-1 ring-primary/45")}>
        <span className="text-[10px] font-semibold uppercase">{format(day, "EEE", { locale: ptBR }).slice(0, 3)}</span>
        <span className="text-sm font-semibold">{format(day, "dd")}</span>
        {count > 0 && <span className={cn("absolute bottom-1 h-1 w-1 rounded-full", isSameDay(day, selectedDate) ? "bg-primary-foreground" : "bg-primary")} />}
      </button>;
    })}
  </div>;
}

function PeriodCalendar({ view, selectedDate, events, onSelect }: { view: "week" | "month"; selectedDate: Date; events: CalendarEvent[]; onSelect: (date: Date) => void }) {
  const start = view === "month" ? startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 }) : startOfWeek(selectedDate, { weekStartsOn: 1 });
  const end = view === "month" ? endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 }) : endOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });
  return <div className="overflow-x-auto p-3 sm:p-5">
    <div className="mb-2 grid min-w-[620px] grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-muted-foreground">
      {eachDayOfInterval({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) }).map((day) => <span key={day.toISOString()}>{format(day, "EEE", { locale: ptBR })}</span>)}
    </div>
    <div className="grid min-w-[620px] grid-cols-7 gap-2">
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const dayEvents = events.filter((event) => event.date === key);
        return <button key={key} type="button" onClick={() => onSelect(day)} className={cn("min-h-28 rounded-xl border p-2 text-left transition hover:border-primary/50 hover:bg-primary/5", view === "month" && !isSameMonth(day, selectedDate) && "opacity-35", isToday(day) && "border-primary/60")}>
          <span className={cn("grid h-7 w-7 place-items-center rounded-lg text-sm font-semibold", isToday(day) && "bg-primary text-primary-foreground")}>{format(day, "dd")}</span>
          <span className="mt-2 block space-y-1">
            {dayEvents.slice(0, view === "week" ? 4 : 2).map((event) => <span key={event.id} className="block truncate rounded-md bg-primary/10 px-1.5 py-1 text-[11px] font-medium text-primary">{event.start_time.slice(0, 5)} {event.title}</span>)}
            {dayEvents.length > (view === "week" ? 4 : 2) && <span className="block text-[10px] text-muted-foreground">+{dayEvents.length - (view === "week" ? 4 : 2)} itens</span>}
          </span>
        </button>;
      })}
    </div>
  </div>;
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
        <p className={cn("font-semibold", completed ? "text-muted-foreground" : "text-foreground")}>
          {event.start_time.slice(0, 5)}
        </p>
        {event.end_time && <p className="text-xs text-muted-foreground">{event.end_time.slice(0, 5)}</p>}
        {!isLast && <div className="absolute right-[-18px] top-9 h-[calc(100%+1rem)] w-px bg-border sm:right-[-22px]" />}
        <div
          className={cn(
            "absolute right-[-25px] top-2 grid h-4 w-4 place-items-center rounded-full border-2 sm:right-[-29px]",
            completed ? "border-primary bg-primary shadow-[0_0_0_5px_hsl(var(--primary)/0.12)]" : "border-primary bg-background shadow-[0_0_0_5px_hsl(var(--primary)/0.10)]"
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
