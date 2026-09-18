import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useTasks } from "@/features/tasks/use-tasks";
import type { Task, TaskPriority } from "@/types/database";

export function TaskForm({ task, onSaved }: { task?: Task; onSaved?: () => void }) {
  const { createTask, updateTask } = useTasks();
  const { toast } = useToast();
  const loading = createTask.isPending || updateTask.isPending;

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const input = {
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      due_date: String(form.get("due_date") || "") || null,
      due_time: String(form.get("due_time") || "") || null,
      priority: String(form.get("priority") || "média") as TaskPriority,
      status: task?.status ?? "pendente"
    };

    try {
      if (task) await updateTask.mutateAsync({ id: task.id, input });
      else await createTask.mutateAsync(input);
      toast({ title: task ? "Tarefa atualizada." : "Tarefa criada." });
      onSaved?.();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Erro ao salvar tarefa.", variant: "error" });
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="task-title">Título</Label>
        <Input id="task-title" name="title" defaultValue={task?.title} placeholder="Confirmar visita" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="due_date">Data</Label>
          <Input id="due_date" name="due_date" type="date" defaultValue={task?.due_date ?? format(new Date(), "yyyy-MM-dd")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="due_time">Horário</Label>
          <Input id="due_time" name="due_time" type="time" defaultValue={task?.due_time?.slice(0, 5) ?? ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Prioridade</Label>
        <Select name="priority" defaultValue={task?.priority ?? "média"}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="baixa">baixa</SelectItem>
            <SelectItem value="média">média</SelectItem>
            <SelectItem value="alta">alta</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="task-description">Descrição</Label>
        <Textarea id="task-description" name="description" defaultValue={task?.description ?? ""} />
      </div>
      <Button disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar tarefa
      </Button>
    </form>
  );
}
