import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Cake, CalendarClock, CircleDollarSign, Pencil, Phone, Search, UserRoundSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClientAvatar } from "./ClientAvatar";
import type { Client, ClientStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const pipelineStatuses: ClientStatus[] = [
  "lead", "em contato", "qualificado", "visita agendada", "proposta", "negociação", "venda realizada", "pós-venda", "perdido"
];

const statusStyles: Record<ClientStatus, string> = {
  lead: "bg-sky-500",
  "em contato": "bg-blue-500",
  qualificado: "bg-cyan-500",
  "visita agendada": "bg-amber-500",
  proposta: "bg-orange-500",
  negociação: "bg-violet-500",
  "venda realizada": "bg-emerald-500",
  "pós-venda": "bg-teal-500",
  perdido: "bg-zinc-500"
};

export function ClientPipeline({ clients, onEdit, onStatus }: {
  clients: Client[];
  onEdit: (client: Client) => void;
  onStatus: (client: Client, status: ClientStatus) => void | boolean | Promise<void | boolean>;
}) {
  const today = new Date();
  const [activeStatus, setActiveStatus] = useState<ClientStatus>(() => firstUsefulStatus(clients));
  const [search, setSearch] = useState("");
  const [movingId, setMovingId] = useState<string>();
  const normalizedSearch = normalize(search);
  const filteredClients = useMemo(
    () => clients.filter((client) => !normalizedSearch || normalize(`${client.name} ${client.city ?? ""} ${client.property_profile ?? ""}`).includes(normalizedSearch)),
    [clients, normalizedSearch]
  );
  const followUps = clients.filter((client) => client.next_follow_up && new Date(`${client.next_follow_up}T12:00:00`) <= addDays(today, 7));
  const anniversaries = clients
    .map((client) => ({ client, date: nextAnniversary(client.sale_date, today) }))
    .filter((item): item is { client: Client; date: Date } => Boolean(item.date && item.date <= addDays(today, 45)))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  async function move(client: Client, next: ClientStatus) {
    setMovingId(client.id);
    try {
      const changed = await onStatus(client, next);
      if (changed !== false) setActiveStatus(next);
    } finally {
      setMovingId(undefined);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Summary icon={UserRoundSearch} label="Em acompanhamento" shortLabel="Ativos" value={clients.filter((client) => !["venda realizada", "pós-venda", "perdido"].includes(client.status)).length} />
        <Summary icon={CalendarClock} label="Follow-ups em 7 dias" shortLabel="Follow-ups" value={followUps.length} accent={followUps.length > 0} />
        <Summary icon={CircleDollarSign} label="Vendas realizadas" shortLabel="Vendas" value={clients.filter((client) => ["venda realizada", "pós-venda"].includes(client.status)).length} />
      </div>

      {anniversaries.length > 0 && (
        <Card className="border-primary/25 bg-primary/5">
          <CardContent className="flex gap-3 p-3 sm:p-4">
            <Cake className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Aniversários de venda</p>
              <div className="mt-1 grid gap-1 sm:grid-cols-3">
                {anniversaries.slice(0, 3).map(({ client, date }) => (
                  <button key={client.id} className="flex min-h-10 items-center justify-between gap-3 rounded-lg px-2 text-left text-sm hover:bg-background/70" onClick={() => onEdit(client)}>
                    <span className="truncate">{client.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="min-h-11 pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente, cidade ou perfil do imóvel" />
        </div>

        <div className="-mx-4 overflow-x-auto px-4 pb-1 md:hidden">
          <div className="flex w-max gap-2">
            {pipelineStatuses.map((status) => {
              const count = filteredClients.filter((client) => client.status === status).length;
              return (
                <button key={status} type="button" onClick={() => setActiveStatus(status)} className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-3 text-sm font-medium capitalize transition",
                  activeStatus === status && "border-primary bg-primary text-primary-foreground shadow-soft"
                )}>
                  <span className={cn("h-2 w-2 rounded-full", activeStatus === status ? "bg-primary-foreground" : statusStyles[status])} />
                  {status}
                  <span className={cn("tabular-nums", activeStatus === status ? "text-primary-foreground/75" : "text-muted-foreground")}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="md:hidden">
          <PipelineColumn status={activeStatus} clients={filteredClients.filter((client) => client.status === activeStatus)} movingId={movingId} onEdit={onEdit} onMove={move} />
        </div>

        <div className="hidden gap-3 md:grid md:grid-cols-2 xl:grid-cols-4">
          {pipelineStatuses.map((status) => (
            <PipelineColumn key={status} status={status} clients={filteredClients.filter((client) => client.status === status)} movingId={movingId} onEdit={onEdit} onMove={move} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PipelineColumn({ status, clients, movingId, onEdit, onMove }: {
  status: ClientStatus;
  clients: Client[];
  movingId?: string;
  onEdit: (client: Client) => void;
  onMove: (client: Client, next: ClientStatus) => Promise<void>;
}) {
  const index = pipelineStatuses.indexOf(status);
  return (
    <section className="min-w-0 rounded-lg border bg-muted/30 p-2.5">
      <header className="mb-2.5 flex min-h-9 items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", statusStyles[status])} />
          <h3 className="truncate text-sm font-semibold capitalize">{status}</h3>
        </div>
        <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold tabular-nums">{clients.length}</span>
      </header>
      <div className="space-y-2">
        {clients.map((client) => (
          <ClientKanbanCard key={client.id} client={client} moving={movingId === client.id} canGoBack={index > 0} canAdvance={index < pipelineStatuses.length - 1} onEdit={() => onEdit(client)} onBack={() => onMove(client, pipelineStatuses[index - 1])} onAdvance={() => onMove(client, pipelineStatuses[index + 1])} />
        ))}
        {clients.length === 0 && <div className="grid min-h-28 place-items-center rounded-lg border border-dashed bg-background/45 px-4 text-center text-sm text-muted-foreground">Nenhum cliente nesta etapa.</div>}
      </div>
    </section>
  );
}

function ClientKanbanCard({ client, moving, canGoBack, canAdvance, onEdit, onBack, onAdvance }: {
  client: Client;
  moving: boolean;
  canGoBack: boolean;
  canAdvance: boolean;
  onEdit: () => void;
  onBack: () => void;
  onAdvance: () => void;
}) {
  const overdue = Boolean(client.next_follow_up && new Date(`${client.next_follow_up}T12:00:00`) <= new Date());
  return (
    <article className="rounded-lg border bg-card p-3 shadow-sm transition hover:border-primary/30 hover:shadow-soft">
      <button className="flex min-h-11 w-full items-center gap-3 text-left" onClick={onEdit}>
        <span className="h-10 w-10 shrink-0"><ClientAvatar name={client.name} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{client.name}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{client.property_profile || client.city || "Perfil não informado"}</span>
        </span>
      </button>
      <div className="mt-2 flex min-h-6 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {client.city && <span className="rounded-full bg-muted px-2 py-1">{client.city}</span>}
        {client.next_follow_up && <span className={cn("rounded-full px-2 py-1", overdue ? "bg-destructive/10 font-semibold text-destructive" : "bg-primary/10 text-primary")}>Follow-up {formatShort(client.next_follow_up)}</span>}
      </div>
      <div className="mt-3 grid grid-cols-[2.5rem_2.5rem_1fr_2.5rem] gap-1.5 border-t pt-2.5">
        <Button type="button" variant="ghost" size="icon" disabled={!canGoBack || moving} onClick={onBack} aria-label={`Voltar etapa de ${client.name}`} title="Voltar etapa"><ArrowLeft className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" onClick={onEdit} aria-label={`Editar ${client.name}`} title="Editar cliente"><Pencil className="h-4 w-4" /></Button>
        {client.whatsapp ? <a className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-2 text-xs font-semibold transition hover:bg-muted" href={`https://wa.me/${client.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><Phone className="h-4 w-4" />WhatsApp</a> : <span />}
        <Button type="button" size="icon" disabled={!canAdvance || moving} onClick={onAdvance} aria-label={`Avançar etapa de ${client.name}`} title="Avançar etapa"><ArrowRight className="h-4 w-4" /></Button>
      </div>
    </article>
  );
}

function Summary({ icon: Icon, label, shortLabel, value, accent }: { icon: React.ElementType; label: string; shortLabel: string; value: number; accent?: boolean }) {
  return <Card className={cn("min-w-0", accent && "border-primary/35 bg-primary/5")}><CardContent className="flex min-h-24 flex-col justify-between p-3 sm:min-h-28 sm:p-4"><div className="flex items-start justify-between gap-1"><p className="text-xs font-medium leading-4 text-muted-foreground sm:hidden">{shortLabel}</p><p className="hidden text-sm font-medium leading-5 text-muted-foreground sm:block">{label}</p><Icon className="h-4 w-4 shrink-0 text-primary" /></div><p className="text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p></CardContent></Card>;
}

function firstUsefulStatus(clients: Client[]): ClientStatus { return pipelineStatuses.find((status) => clients.some((client) => client.status === status)) ?? "lead"; }
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
function addDays(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return next; }
function nextAnniversary(saleDate: string | null, reference: Date) { if (!saleDate) return null; const sold = new Date(`${saleDate}T12:00:00`); let next = new Date(reference.getFullYear(), sold.getMonth(), sold.getDate(), 12); if (next < reference) next = new Date(reference.getFullYear() + 1, sold.getMonth(), sold.getDate(), 12); return next; }
function formatShort(date: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`)); }
