import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Check, ChevronDown, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useTasks } from "@/features/tasks/use-tasks";
import type { Task, TaskPriority } from "@/types/database";

const defaultTaskTemplates = [
  "Visitar cliente",
  "Conhecer imóvel",
  "Ligar para cliente",
  "Ir no registro",
  "Trocar Luz",
  "Trocar IPTU",
  "Confirmar visita",
  "Fazer follow-up",
  "Enviar documentação",
  "Captar imóvel"
];

const templatesStorageKey = "mv-broker-task-templates";
const templateUsageStorageKey = "mv-broker-task-template-usage";

export function TaskForm({ task, onSaved }: { task?: Task; onSaved?: () => void }) {
  const { createTask, updateTask } = useTasks();
  const { toast } = useToast();
  const loading = createTask.isPending || updateTask.isPending;
  const [title, setTitle] = useState(task?.title ?? "");
  const [showAll, setShowAll] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<string[]>(readStoredTemplates);
  const [templateUsage, setTemplateUsage] = useState<Record<string, number>>(readTemplateUsage);
  const templates = useMemo(() => {
    const unique = [...defaultTaskTemplates, ...customTemplates].filter((item, index, items) =>
      items.findIndex((candidate) => normalizeTask(candidate) === normalizeTask(item)) === index
    );
    return unique.sort((a, b) => {
      const usageDifference = (templateUsage[normalizeTask(b)] ?? 0) - (templateUsage[normalizeTask(a)] ?? 0);
      if (usageDifference) return usageDifference;
      const aDefault = defaultTaskTemplates.findIndex((item) => normalizeTask(item) === normalizeTask(a));
      const bDefault = defaultTaskTemplates.findIndex((item) => normalizeTask(item) === normalizeTask(b));
      return (aDefault < 0 ? 999 : aDefault) - (bDefault < 0 ? 999 : bDefault);
    });
  }, [customTemplates, templateUsage]);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const input = {
      title: title.trim(),
      description: String(form.get("description") || "").trim() || null,
      due_date: String(form.get("due_date") || "") || null,
      due_time: String(form.get("due_time") || "") || null,
      priority: String(form.get("priority") || "média") as TaskPriority,
      status: task?.status ?? "pendente"
    };

    try {
      if (task) await updateTask.mutateAsync({ id: task.id, input });
      else await createTask.mutateAsync(input);
      rememberTemplate(input.title, customTemplates, setCustomTemplates, templateUsage, setTemplateUsage);
      toast({ title: task ? "Tarefa atualizada." : "Tarefa criada." });
      onSaved?.();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Erro ao salvar tarefa.", variant: "error" });
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {!task && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label className="inline-flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />Ações rápidas</Label>
            <span className="text-[0.68rem] text-muted-foreground">Mais usadas primeiro</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(showAll ? templates : templates.slice(0, 6)).map((template) => {
              const selected = normalizeTask(title) === normalizeTask(template);
              return (
                <button
                  key={template}
                  type="button"
                  title={template}
                  aria-pressed={selected}
                  onClick={() => setTitle(template)}
                  className={selected
                    ? "flex min-h-11 min-w-0 items-center justify-between gap-1 rounded-xl border border-primary bg-primary/12 px-3 text-left text-xs font-semibold text-primary ring-1 ring-primary/30"
                    : "min-h-11 min-w-0 truncate rounded-xl border bg-card px-3 text-left text-xs font-semibold transition hover:border-primary/40 hover:bg-primary/5"
                  }
                >
                  <span className="truncate">{template}</span>
                  {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
          {templates.length > 6 && (
            <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setShowAll((current) => !current)}>
              {showAll ? "Mostrar principais" : `Ver todas as ${templates.length} ações`}
              <ChevronDown className={showAll ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
            </Button>
          )}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="task-title">Título</Label>
        <Input id="task-title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Digite ou escolha uma ação rápida" required />
        {!task && <p className="text-xs text-muted-foreground">Ao salvar um título novo, ele ficará disponível como botão rápido.</p>}
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

function normalizeTask(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function readStoredTemplates() {
  try {
    const parsed = JSON.parse(localStorage.getItem(templatesStorageKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function readTemplateUsage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(templateUsageStorageKey) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed as Record<string, number> : {};
  } catch {
    return {};
  }
}

function rememberTemplate(
  title: string,
  customTemplates: string[],
  setCustomTemplates: React.Dispatch<React.SetStateAction<string[]>>,
  usage: Record<string, number>,
  setUsage: React.Dispatch<React.SetStateAction<Record<string, number>>>
) {
  const cleanTitle = title.trim();
  if (!cleanTitle) return;
  const known = [...defaultTaskTemplates, ...customTemplates].some((item) => normalizeTask(item) === normalizeTask(cleanTitle));
  if (!known) {
    const nextTemplates = [...customTemplates, cleanTitle];
    setCustomTemplates(nextTemplates);
    try { localStorage.setItem(templatesStorageKey, JSON.stringify(nextTemplates)); } catch { /* Mantém o cadastro funcional sem armazenamento local. */ }
  }
  const key = normalizeTask(cleanTitle);
  const nextUsage = { ...usage, [key]: (usage[key] ?? 0) + 1 };
  setUsage(nextUsage);
  try { localStorage.setItem(templateUsageStorageKey, JSON.stringify(nextUsage)); } catch { /* Mantém o cadastro funcional sem armazenamento local. */ }
}
