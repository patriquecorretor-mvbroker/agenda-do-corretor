import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTask, deleteTask, listTasks, updateTask, type TaskInsert } from "@/features/tasks/tasks-service";
import { useAuth } from "@/features/auth/auth-context";
import { demoTasks } from "@/lib/demo-data";
import type { Task } from "@/types/database";

export function useTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ["tasks", user?.id],
    queryFn: () => listTasks(user!.id),
    enabled: Boolean(user)
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tasks", user?.id] });

  return {
    tasks: tasksQuery.data?.length ? tasksQuery.data : tasksQuery.data ?? demoTasks,
    isLoading: tasksQuery.isLoading,
    error: tasksQuery.error,
    createTask: useMutation({
      mutationFn: (input: Omit<TaskInsert, "user_id">) => createTask({ ...input, user_id: user!.id }),
      onSuccess: invalidate
    }),
    updateTask: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<Task> }) => updateTask(id, user!.id, input),
      onSuccess: invalidate
    }),
    deleteTask: useMutation({
      mutationFn: (id: string) => deleteTask(id, user!.id),
      onSuccess: invalidate
    })
  };
}
