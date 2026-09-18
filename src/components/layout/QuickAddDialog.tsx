import { useState } from "react";
import { CalendarPlus, CheckSquare } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EventForm } from "@/features/calendar/EventForm";
import { TaskForm } from "@/features/tasks/TaskForm";

export function QuickAddDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [mode, setMode] = useState<"event" | "task">("event");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar</DialogTitle>
          <DialogDescription>Cadastre um compromisso ou tarefa para sua rotina.</DialogDescription>
        </DialogHeader>
        <div className="mb-5 grid grid-cols-2 gap-2">
          <Button type="button" variant={mode === "event" ? "default" : "outline"} onClick={() => setMode("event")}>
            <CalendarPlus className="h-4 w-4" />
            Compromisso
          </Button>
          <Button type="button" variant={mode === "task" ? "default" : "outline"} onClick={() => setMode("task")}>
            <CheckSquare className="h-4 w-4" />
            Tarefa
          </Button>
        </div>
        {mode === "event" ? <EventForm onSaved={() => onOpenChange(false)} /> : <TaskForm onSaved={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
