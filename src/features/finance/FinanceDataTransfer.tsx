import { useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn, formatCurrency } from "@/lib/utils";
import { useFinance } from "@/features/finance/use-finance";
import {
  parseStatementFile,
  statementExpenseCategories,
  statementIncomeCategories,
  type ImportedStatementRow,
  type StatementImportMode
} from "@/features/finance/finance-import";

export function FinanceDataTransfer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const finance = useFinance();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<StatementImportMode>("card");
  const [rows, setRows] = useState<ImportedStatementRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isReading, setIsReading] = useState(false);

  const selectedRows = rows.filter((row) => row.selected && !row.duplicate);
  const duplicateCount = rows.filter((row) => row.duplicate).length;
  const selectedTotal = useMemo(() => selectedRows.reduce((total, row) => total + row.amount, 0), [selectedRows]);

  async function readFile(file?: File, selectedMode = mode) {
    if (!file) return;
    setIsReading(true);
    setError("");
    try {
      const parsed = await parseStatementFile(file, selectedMode);
      const existing = new Set(finance.transactions.map(transactionKey));
      const checked = parsed.map((row) => {
        const duplicate = existing.has(transactionKey({ ...row, paid_date: row.date }));
        return { ...row, duplicate, selected: !duplicate };
      });
      setRows(checked);
      setFileName(file.name);
      setSourceFile(file);
      if (!checked.length) setError("Nenhum lançamento válido foi encontrado no arquivo.");
    } catch (caught) {
      setRows([]);
      setFileName(file.name);
      setError(caught instanceof Error ? caught.message : "Não foi possível ler o extrato.");
    } finally {
      setIsReading(false);
    }
  }

  async function importSelected() {
    if (!selectedRows.length) return;
    await finance.createTransactions.mutateAsync(selectedRows.map((row) => ({
      type: row.type,
      category: row.category,
      description: row.description,
      amount: row.amount,
      due_date: row.date,
      paid_date: row.date,
      status: row.type === "income" ? "recebido" : "pago",
      payment_method: mode === "card" ? "cartão" : "transferência",
      notes: `Importado de ${fileName}`,
      is_recurring: false,
      recurrence_rule: null
    })));
    toast({ title: `${selectedRows.length} lançamento(s) importado(s) no fluxo de caixa.` });
    setRows([]);
    setFileName("");
    setSourceFile(null);
    onOpenChange(false);
  }

  function updateRow(id: string, input: Partial<ImportedStatementRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...input } : row));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar e exportar dados</DialogTitle>
          <DialogDescription>Traga um extrato em CSV, TXT ou OFX, confira a classificação e só depois registre os movimentos.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-3xl border bg-background/45 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Importar extrato</p>
                <p className="text-xs leading-5 text-muted-foreground">O sistema reconhece data, descrição e valor e sugere a categoria.</p>
              </div>
              <div className="grid grid-cols-2 rounded-2xl border bg-card p-1">
                <ModeButton active={mode === "card"} onClick={() => { setMode("card"); if (sourceFile) void readFile(sourceFile, "card"); }}>Cartão</ModeButton>
                <ModeButton active={mode === "bank"} onClick={() => { setMode("bank"); if (sourceFile) void readFile(sourceFile, "bank"); }}>Conta</ModeButton>
              </div>
            </div>

            <input ref={fileInput} type="file" className="hidden" accept=".csv,.txt,.ofx,text/csv,text/plain" onChange={(event) => void readFile(event.target.files?.[0])} />
            <button type="button" onClick={() => fileInput.current?.click()} className="mt-4 grid min-h-28 w-full place-items-center rounded-2xl border border-dashed bg-card p-4 text-center transition hover:border-primary/55 hover:bg-primary/[0.03]">
              <span className="grid h-10 w-10 place-items-center rounded-xl border bg-background text-primary"><Upload className="h-5 w-5" /></span>
              <span className="mt-2 text-sm font-semibold">{isReading ? "Lendo extrato..." : fileName || "Selecionar extrato"}</span>
              <span className="mt-1 text-xs text-muted-foreground">CSV, TXT ou OFX</span>
            </button>

            {error && <div className="mt-3 flex gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

            {rows.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><p className="text-sm font-semibold">Prévia do extrato</p><p className="text-xs text-muted-foreground">{selectedRows.length} selecionados · {formatCurrency(selectedTotal)}{duplicateCount ? ` · ${duplicateCount} repetido(s)` : ""}</p></div>
                  <Button variant="ghost" size="sm" onClick={() => setRows((current) => current.map((row) => ({ ...row, selected: !row.duplicate })))}>Selecionar válidos</Button>
                </div>
                <div className="max-h-[390px] space-y-2 overflow-y-auto pr-1">
                  {rows.map((row) => {
                    const categories = row.type === "income" ? statementIncomeCategories : statementExpenseCategories;
                    return <article key={row.id} className={cn("rounded-2xl border bg-card p-3 transition", !row.selected && "opacity-55", row.duplicate && "border-amber-500/25 bg-amber-500/5")}>
                      <div className="flex gap-3">
                        <input type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" checked={row.selected} disabled={row.duplicate} onChange={(event) => updateRow(row.id, { selected: event.target.checked })} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{row.description}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(row.date)} · {row.type === "income" ? "Entrada" : "Saída"}</p></div><strong className={cn("shrink-0 text-sm", row.type === "income" ? "text-emerald-600" : "text-foreground")}>{row.type === "income" ? "+" : "-"}{formatCurrency(row.amount)}</strong></div>
                          <div className="mt-3"><Select value={row.category} onValueChange={(category) => updateRow(row.id, { category })}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div>
                          {row.duplicate && <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">Já existe um lançamento igual e ele não será importado.</p>}
                        </div>
                      </div>
                    </article>;
                  })}
                </div>
                <Button className="w-full" disabled={!selectedRows.length || finance.createTransactions.isPending} onClick={() => void importSelected()}><CheckCircle2 className="h-4 w-4" />{finance.createTransactions.isPending ? "Importando..." : `Importar ${selectedRows.length} lançamento(s)`}</Button>
              </div>
            )}
          </section>

          <section className="rounded-3xl border bg-card p-4">
            <div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-primary" /><p className="font-semibold">Exportar dados</p></div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Baixe arquivos organizados para planilhas, conferência ou envio ao contador.</p>
            <div className="mt-4 grid gap-2">
              <ExportButton label="Movimentações" count={finance.transactions.length} onClick={() => downloadCsv("movimentacoes", finance.transactions)} />
              <ExportButton label="Comissões" count={finance.commissions.length} onClick={() => downloadCsv("comissoes", finance.commissions)} />
              <ExportButton label="Parcelas" count={finance.installments.length} onClick={() => downloadCsv("parcelas", finance.installments)} />
            </div>
            <div className="mt-4 rounded-2xl border bg-background/50 p-3 text-xs leading-5 text-muted-foreground">A importação não grava automaticamente. Você sempre revisa os itens, as categorias e os duplicados antes de confirmar.</div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn("min-h-9 rounded-xl px-3 text-xs font-semibold transition", active ? "bg-foreground text-background" : "text-muted-foreground")}>{children}</button>;
}

function ExportButton({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  return <Button variant="outline" className="h-12 justify-between" onClick={onClick}><span className="flex items-center gap-2"><Download className="h-4 w-4" />{label}</span><span className="text-xs text-muted-foreground">{count}</span></Button>;
}

function transactionKey(item: { description?: string | null; amount: number; paid_date?: string | null; date?: string }) {
  return `${(item.paid_date ?? item.date ?? "").slice(0, 10)}|${Number(item.amount).toFixed(2)}|${String(item.description ?? "").trim().toLocaleLowerCase("pt-BR")}`;
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function downloadCsv(name: string, rows: unknown[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0] as Record<string, unknown>);
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = `\uFEFF${keys.join(";")}\n${rows.map((row) => keys.map((key) => escape((row as Record<string, unknown>)[key])).join(";")).join("\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
