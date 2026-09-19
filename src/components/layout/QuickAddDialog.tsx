import { useState } from "react";
import { Banknote, CalendarPlus, CheckSquare, Receipt, WalletCards } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EventForm } from "@/features/calendar/EventForm";
import { TaskForm } from "@/features/tasks/TaskForm";
import { CommissionForm, TransactionForm } from "@/features/finance/FinancePage";

type QuickAddMode = "event" | "task" | "income" | "expense" | "commission";

export function QuickAddDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [mode, setMode] = useState<QuickAddMode>("event");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar</DialogTitle>
          <DialogDescription>Cadastre rotina, receita, despesa ou comissão em poucos toques.</DialogDescription>
        </DialogHeader>
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Button type="button" variant={mode === "event" ? "default" : "outline"} onClick={() => setMode("event")}>
            <CalendarPlus className="h-4 w-4" />
            Compromisso
          </Button>
          <Button type="button" variant={mode === "task" ? "default" : "outline"} onClick={() => setMode("task")}>
            <CheckSquare className="h-4 w-4" />
            Tarefa
          </Button>
          <Button type="button" variant={mode === "income" ? "default" : "outline"} onClick={() => setMode("income")}>
            <Banknote className="h-4 w-4" />
            Receita
          </Button>
          <Button type="button" variant={mode === "expense" ? "default" : "outline"} onClick={() => setMode("expense")}>
            <Receipt className="h-4 w-4" />
            Despesa
          </Button>
          <Button type="button" variant={mode === "commission" ? "default" : "outline"} onClick={() => setMode("commission")}>
            <WalletCards className="h-4 w-4" />
            Comissão
          </Button>
        </div>
        {mode === "event" && <EventForm onSaved={() => onOpenChange(false)} />}
        {mode === "task" && <TaskForm onSaved={() => onOpenChange(false)} />}
        {mode === "income" && <TransactionForm type="income" onSaved={() => onOpenChange(false)} />}
        {mode === "expense" && <TransactionForm type="expense" onSaved={() => onOpenChange(false)} />}
        {mode === "commission" && <CommissionForm onSaved={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
