import { useEffect, useState } from "react";
import { Banknote, CalendarClock, CalendarPlus, CheckSquare, Receipt, UserPlus, WalletCards } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EventForm } from "@/features/calendar/EventForm";
import { TaskForm } from "@/features/tasks/TaskForm";
import { CommissionForm, TransactionForm } from "@/features/finance/FinancePage";
import { ClientForm } from "@/features/clients/ClientForm";
import { useClients } from "@/features/clients/use-clients";
import { useToast } from "@/components/ui/toast";
import type { ClientInput } from "@/features/clients/client-service";

type QuickAddMode = "event" | "task" | "client" | "income" | "expense" | "payable" | "commission";

export function QuickAddDialog({ open, onOpenChange, financeEnabled = true }: { open: boolean; onOpenChange: (open: boolean) => void; financeEnabled?: boolean }) {
  const [mode, setMode] = useState<QuickAddMode>("event");
  useEffect(() => {
    if (!financeEnabled && ["income", "expense", "payable", "commission"].includes(mode)) setMode("event");
  }, [financeEnabled, mode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar</DialogTitle>
          <DialogDescription>Cadastre rotina, receita, despesa paga, conta a pagar ou comissão.</DialogDescription>
        </DialogHeader>
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Button type="button" variant={mode === "event" ? "default" : "outline"} onClick={() => setMode("event")}>
            <CalendarPlus className="h-4 w-4" />
            Compromisso
          </Button>
          <Button type="button" variant={mode === "task" ? "default" : "outline"} onClick={() => setMode("task")}>
            <CheckSquare className="h-4 w-4" />
            Tarefa
          </Button>
          <Button type="button" variant={mode === "client" ? "default" : "outline"} onClick={() => setMode("client")}>
            <UserPlus className="h-4 w-4" />
            Cliente
          </Button>
          {financeEnabled && <Button type="button" variant={mode === "income" ? "default" : "outline"} onClick={() => setMode("income")}>
            <Banknote className="h-4 w-4" />
            Receita
          </Button>}
          {financeEnabled && <Button type="button" variant={mode === "expense" ? "default" : "outline"} onClick={() => setMode("expense")}>
            <Receipt className="h-4 w-4" />
            Despesa
          </Button>}
          {financeEnabled && <Button type="button" variant={mode === "payable" ? "default" : "outline"} onClick={() => setMode("payable")}>
            <CalendarClock className="h-4 w-4" />
            Conta a pagar
          </Button>}
          {financeEnabled && <Button type="button" variant={mode === "commission" ? "default" : "outline"} onClick={() => setMode("commission")}>
            <WalletCards className="h-4 w-4" />
            Comissão
          </Button>}
        </div>
        {mode === "event" && <EventForm onSaved={() => onOpenChange(false)} />}
        {mode === "task" && <TaskForm onSaved={() => onOpenChange(false)} />}
        {mode === "client" && <QuickClientForm onSaved={() => onOpenChange(false)} />}
        {mode === "income" && <TransactionForm type="income" onSaved={() => onOpenChange(false)} />}
        {mode === "expense" && <TransactionForm type="expense" onSaved={() => onOpenChange(false)} />}
        {mode === "payable" && <TransactionForm type="expense" settlement="pending" onSaved={() => onOpenChange(false)} />}
        {mode === "commission" && <CommissionForm onSaved={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function QuickClientForm({ onSaved }: { onSaved: () => void }) {
  const clients = useClients();
  const { toast } = useToast();
  async function save(input: ClientInput) {
    try { await clients.createClient.mutateAsync(input); toast({ title: "Cliente cadastrado." }); onSaved(); }
    catch { toast({ title: "Não foi possível cadastrar o cliente.", variant: "error" }); }
  }
  return <ClientForm saving={clients.createClient.isPending} onSave={save} />;
}
