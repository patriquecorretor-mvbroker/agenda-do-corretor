import { CalendarClock, Cake, ChevronRight, CircleDollarSign, Phone, UserRoundSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientAvatar } from "./ClientAvatar";
import { clientStatuses } from "./ClientForm";
import type { Client, ClientStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const activeStatuses: ClientStatus[] = ["lead", "em contato", "qualificado", "visita agendada", "proposta", "negociação", "venda realizada", "pós-venda"];

export function ClientPipeline({ clients, onEdit, onStatus }: { clients: Client[]; onEdit: (client: Client) => void; onStatus: (client: Client, status: ClientStatus) => void }) {
  const today = new Date();
  const followUps = clients.filter((client) => client.next_follow_up && new Date(`${client.next_follow_up}T12:00:00`) <= addDays(today, 7));
  const anniversaries = clients.map((client) => ({ client, date: nextAnniversary(client.sale_date, today) })).filter((item): item is { client: Client; date: Date } => Boolean(item.date && item.date <= addDays(today, 45))).sort((a, b) => a.date.getTime() - b.date.getTime());
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3">
      <Summary icon={UserRoundSearch} label="Em acompanhamento" value={clients.filter((client) => !["venda realizada", "pós-venda", "perdido"].includes(client.status)).length} />
      <Summary icon={CalendarClock} label="Follow-ups em 7 dias" value={followUps.length} accent={followUps.length > 0} />
      <Summary icon={CircleDollarSign} label="Vendas realizadas" value={clients.filter((client) => ["venda realizada", "pós-venda"].includes(client.status)).length} />
    </div>
    {anniversaries.length > 0 && <Card className="border-primary/25 bg-primary/5"><CardContent className="flex gap-3 p-4"><Cake className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="font-medium">Aniversários de venda</p>{anniversaries.slice(0, 3).map(({ client, date }) => <button key={client.id} className="mt-2 flex min-h-9 w-full items-center justify-between gap-4 text-left text-sm" onClick={() => onEdit(client)}><span>{client.name}</span><span className="text-muted-foreground">{date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span></button>)}</div></CardContent></Card>}
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[1120px] grid-cols-8 gap-3">
        {activeStatuses.map((status, index) => {
          const stageClients = clients.filter((client) => client.status === status);
          return <section key={status} className="min-w-0 rounded-lg border bg-muted/35 p-2.5">
            <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold capitalize">{status}</p><span className="rounded-full bg-background px-2 py-0.5 text-xs tabular-nums">{stageClients.length}</span></div>
            <div className="space-y-2">{stageClients.slice(0, 8).map((client) => <article key={client.id} className="rounded-lg border bg-card p-3 shadow-sm">
              <button className="flex min-h-10 w-full items-center gap-2 text-left" onClick={() => onEdit(client)}><span className="h-9 w-9 shrink-0"><ClientAvatar name={client.name} /></span><span className="min-w-0"><span className="block truncate text-sm font-medium">{client.name}</span><span className="block truncate text-xs text-muted-foreground">{client.city || client.property_profile || "Sem detalhes"}</span></span></button>
              {client.next_follow_up && <p className={cn("mt-2 text-xs", new Date(`${client.next_follow_up}T12:00:00`) <= today ? "font-semibold text-destructive" : "text-muted-foreground")}>Follow-up {formatShort(client.next_follow_up)}</p>}
              {index < activeStatuses.length - 1 && <Button variant="ghost" className="mt-2 h-9 w-full justify-between px-2 text-xs" onClick={() => onStatus(client, activeStatuses[index + 1])}>Avançar <ChevronRight className="h-4 w-4" /></Button>}
            </article>)}</div>
          </section>;
        })}
      </div>
    </div>
    <div className="grid gap-3 md:grid-cols-2">{clients.slice(0, 8).map((client) => <Card key={client.id}><CardContent className="flex items-center gap-3 p-4"><span className="h-11 w-11 shrink-0"><ClientAvatar name={client.name} /></span><button className="min-w-0 flex-1 text-left" onClick={() => onEdit(client)}><p className="truncate font-medium">{client.name}</p><p className="truncate text-sm text-muted-foreground">{client.property_profile || client.city || "Perfil não informado"}</p></button><Select value={client.status} onValueChange={(value) => onStatus(client, value as ClientStatus)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{clientStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select>{client.whatsapp && <a className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border" href={`https://wa.me/${client.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" aria-label={`Abrir WhatsApp de ${client.name}`}><Phone className="h-4 w-4" /></a>}</CardContent></Card>)}</div>
  </div>;
}

function Summary({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number; accent?: boolean }) { return <Card className={cn(accent && "border-primary/35")}><CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2"><CardTitle className="text-sm font-medium">{label}</CardTitle><Icon className="h-4 w-4 text-primary" /></CardHeader><CardContent className="p-4 pt-0 text-2xl font-semibold">{value}</CardContent></Card>; }
function addDays(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return next; }
function nextAnniversary(saleDate: string | null, reference: Date) { if (!saleDate) return null; const sold = new Date(`${saleDate}T12:00:00`); let next = new Date(reference.getFullYear(), sold.getMonth(), sold.getDate(), 12); if (next < reference) next = new Date(reference.getFullYear() + 1, sold.getMonth(), sold.getDate(), 12); return next; }
function formatShort(date: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`)); }
