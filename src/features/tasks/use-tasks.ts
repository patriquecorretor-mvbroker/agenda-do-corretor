import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTask, deleteTask, listTasks, updateTask, type TaskInsert } from "@/features/tasks/tasks-service";
import { useAuth } from "@/features/auth/auth-context";
import { demoTasks } from "@/lib/demo-data";
import { hasSupabaseConfig } from "@/lib/supabase";
import type { Task } from "@/types/database";

const tasksKey = "agenda-demo-tasks";

function readDemoTasks() {
  const saved = localStorage.getItem(tasksKey);
  return saved ? (JSON.parse(saved) as Task[]) : demoTasks;
}

function writeDemoTasks(tasks: Task[]) {
  localStorage.setItem(tasksKey, JSON.stringify(tasks));
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `local-${Date.now()}`;
}

export function useTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ["tasks", user?.id],
    queryFn: () => (hasSupabaseConfig ? listTasks(user!.id) : readDemoTasks()),
    enabled: Boolean(user)
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tasks", user?.id] });

  return {
    tasks: tasksQuery.data?.length ? tasksQuery.data : tasksQuery.data ?? demoTasks,
    isLoading: tasksQuery.isLoading,
    error: tasksQuery.error,
    createTask: useMutation({
      mutationFn: async (input: Omit<TaskInsert, "user_id">) => {
        if (hasSupabaseConfig) return createTask({ ...input, user_id: user!.id });
        const next: Task = {
          id: createId(),
          user_id: user!.id,
          title: input.title,
          description: input.description ?? null,
          due_date: input.due_date ?? null,
          due_time: input.due_time ?? null,
          priority: input.priority ?? "média",
          status: input.status ?? "pendente",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        writeDemoTasks([...readDemoTasks(), next]);
        return next;
      },
      onSuccess: invalidate
    }),
    updateTask: useMutation({
      mutationFn: async ({ id, input }: { id: string; input: Partial<Task> }) => {
        if (hasSupabaseConfig) return updateTask(id, user!.id, input);
        let updated = readDemoTasks().find((task) => task.id === id);
        const next = readDemoTasks().map((task) => {
          if (task.id !== id) return task;
          updated = { ...task, ...input, updated_at: new Date().toISOString() };
          return updated;
        });
        writeDemoTasks(next);
        return updated!;
      },
      onSuccess: invalidate
    }),
    deleteTask: useMutation({
      mutationFn: async (id: string) => {
        if (hasSupabaseConfig) return deleteTask(id, user!.id);
        writeDemoTasks(readDemoTasks().filter((task) => task.id !== id));
      },
      onSuccess: invalidate
    })
  };
}
