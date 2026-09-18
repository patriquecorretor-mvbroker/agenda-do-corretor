import { useState } from "react";
import { format } from "date-fns";
import { CalendarClock, Check, Edit3, MoreHorizontal, StickyNote, Trash2 } from "lucide-react";
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
      <header>
        <p className="text-sm text-muted-foreground">Agenda</p>
        <h1 className="text-3xl font-semibold">Hoje e tarefas</h1>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Compromissos</CardTitle>
            <CardDescription>Editar, concluir, reagendar, excluir ou adicionar observações.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length ? (
              events.map((event) => (
                <article key={event.id} className="rounded-3xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-primary">
                        <CalendarClock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {event.start_time.slice(0, 5)} {event.end_time ? `- ${event.end_time.slice(0, 5)}` : ""} • {event.type}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{event.location ?? "Local não informado"}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{event.status}</span>
                  </div>
                  {event.notes && <p className="mt-3 rounded-2xl bg-muted p-3 text-sm">{event.notes}</p>}
                  <div className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => updateEvent.mutate({ id: event.id, input: { status: event.status === "concluído" ? "agendado" : "concluído" } })}>
                      <Check className="h-4 w-4" />
                      {event.status === "concluído" ? "Reabrir" : "Concluir"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingEvent(event)}>
                      <Edit3 className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRescheduleEvent(event)}>
                      <MoreHorizontal className="h-4 w-4" />
                      Reagendar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setNotesEvent(event)}>
                      <StickyNote className="h-4 w-4" />
                      Observação
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteTarget({ type: "event", id: event.id })}>
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <Empty text="Nenhum compromisso cadastrado para hoje." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarefas</CardTitle>
            <CardDescription>Pendências do dia e próximas ações.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length ? (
              tasks.map((task) => (
                <article key={task.id} className="rounded-3xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.due_date ?? "sem data"} {task.due_time ? `• ${task.due_time.slice(0, 5)}` : ""} • {task.priority}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{task.status}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => updateTask.mutate({ id: task.id, input: { status: task.status === "concluída" ? "pendente" : "concluída" } })}>
                      <Check className="h-4 w-4" />
                      {task.status === "concluída" ? "Reabrir" : "Concluir"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingTask(task)}>
                      <Edit3 className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteTarget({ type: "task", id: task.id })}>
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <Empty text="Nenhuma tarefa cadastrada." />
            )}
          </CardContent>
        </Card>
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
            <DialogTitle>Adicionar observação</DialogTitle>
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
              <Textarea name="notes" defaultValue={notesEvent.notes ?? ""} />
              <Button>Salvar observação</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rescheduleEvent)} onOpenChange={() => setRescheduleEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reagendar compromisso</DialogTitle>
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

function Empty({ text }: { text: string }) {
  return <div className="rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
