import { useState } from "react";
import { Check, CircleDollarSign, History, MapPin, Megaphone, MessageCircle, Pencil, Phone, Plus, Thermometer, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import { ClientAvatar } from "./ClientAvatar";
import { clientStatuses, clientTemperatures } from "./ClientForm";
import { useClientActivities } from "./use-client-activities";
import type { Client, ClientActivityType, ClientStatus, ClientTemperature } from "@/types/database";

const activityOptions: Array<{ value: ClientActivityType; label: string }> = [
  { value: "ligação", label: "Ligação" },
  { value: "mensagem", label: "Mensagem" },
  { value: "visita", label: "Visita" },
  { value: "proposta", label: "Proposta" },
  { value: "follow-up", label: "Follow-up" },
  { value: "observação", label: "Observação" }
];

export function ClientDetailDialog({ client, open, onOpenChange, onEdit, onStatus, onFollowUp, onTemperature }: {
  client?: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (client: Client) => void;
  onStatus: (client: Client, status: ClientStatus) => Promise<boolean>;
  onFollowUp: (client: Client, date: string | null) => Promise<boolean>;
  onTemperature: (client: Client, temperature: ClientTemperature) => Promise<boolean>;
}) {
  if (!client) return null;
  return <ClientDetailContent client={client} open={open} onOpenChange={onOpenChange} onEdit={onEdit} onStatus={onStatus} onFollowUp={onFollowUp} onTemperature={onTemperature} />;
}

function ClientDetailContent({ client, open, onOpenChange, onEdit, onStatus, onFollowUp, onTemperature }: {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (client: Client) => void;
  onStatus: (client: Client, status: ClientStatus) => Promise<boolean>;
  onFollowUp: (client: Client, date: string | null) => Promise<boolean>;
  onTemperature: (client: Client, temperature: ClientTemperature) => Promise<boolean>;
}) {
  const { toast } = useToast();
  const timeline = useClientActivities(client);
  const [activityType, setActivityType] = useState<ClientActivityType>("ligação");
  const [activityDetails, setActivityDetails] = useState("");
  const [followUp, setFollowUp] = useState(client.next_follow_up ?? "");
  const [savingStatus, setSavingStatus] = useState(false);

  async function registerActivity() {
    try {
      const label = activityOptions.find((item) => item.value === activityType)?.label ?? "Interação";
      await timeline.createActivity.mutateAsync({ type: activityType, title: `${label} registrada`, details: activityDetails.trim() || null });
      setActivityDetails("");
      toast({ title: `${label} adicionada ao histórico.` });
    } catch {
      toast({ title: "Não foi possível registrar a atividade.", variant: "error" });
    }
  }

  async function changeStatus(next: ClientStatus) {
    setSavingStatus(true);
    await onStatus(client, next);
    setSavingStatus(false);
  }

  async function saveFollowUp() {
    if (await onFollowUp(client, followUp || null)) toast({ title: followUp ? "Próximo follow-up atualizado." : "Follow-up removido." });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto p-0 sm:max-w-3xl">
        <div className="bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.22),_transparent_38%),linear-gradient(145deg,_#050403,_#14100b)] p-5 pr-14 text-white sm:p-6 sm:pr-16">
          <DialogHeader className="mb-0">
            <div className="flex items-center gap-3">
              <span className="h-14 w-14 shrink-0"><ClientAvatar name={client.name} /></span>
              <div className="min-w-0">
                <DialogTitle className="truncate text-white">{client.name}</DialogTitle>
                <DialogDescription className="mt-1 capitalize text-white/58">{client.status}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {client.whatsapp && <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-semibold hover:bg-white/10" href={`https://wa.me/${client.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 text-primary" />WhatsApp</a>}
            {client.phone && <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-semibold hover:bg-white/10" href={`tel:${client.phone}`}><Phone className="h-4 w-4 text-primary" />Ligar</a>}
            <Button className="min-h-11" variant="outline" onClick={() => onEdit(client)}><Pencil className="h-4 w-4" />Editar</Button>
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Info icon={UserRound} label="Interesse" value={client.property_profile || "Não informado"} />
            <Info icon={MapPin} label="Localização" value={[client.neighborhood, client.city].filter(Boolean).join(", ") || "Não informada"} />
            <Info icon={CircleDollarSign} label="Faixa de investimento" value={budgetLabel(client)} />
            <Info icon={Megaphone} label="Fonte de captação" value={client.source || "Não informada"} />
          </section>

          <section className="grid gap-4 rounded-lg border bg-muted/25 p-4 lg:grid-cols-[1fr_1fr_1.2fr]">
            <div className="space-y-2">
              <Label>Etapa atual</Label>
              <Select value={client.status} disabled={savingStatus} onValueChange={(value) => changeStatus(value as ClientStatus)}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>{clientStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="detail-follow-up">Próximo follow-up</Label>
              <div className="grid grid-cols-[1fr_3rem] gap-2">
                <Input id="detail-follow-up" className="rounded-lg" type="date" value={followUp} onChange={(event) => setFollowUp(event.target.value)} />
                <Button size="icon" variant="outline" onClick={saveFollowUp} aria-label="Salvar follow-up"><Check className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Thermometer className="h-3.5 w-3.5" />Temperatura do cliente</Label>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                {clientTemperatures.map((temperature) => (
                  <button key={temperature} type="button" onClick={() => onTemperature(client, temperature)} className={temperatureButtonClass(temperature, client.temperature === temperature)}>{temperature}</button>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <div className="mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /><h3 className="font-semibold">Registrar interação</h3></div>
            <div className="grid gap-3 sm:grid-cols-[11rem_1fr_auto] sm:items-end">
              <div className="space-y-2"><Label>Tipo</Label><Select value={activityType} onValueChange={(value) => setActivityType(value as ClientActivityType)}><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger><SelectContent>{activityOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="activity-details">Resumo</Label><Textarea id="activity-details" className="min-h-12 rounded-lg" rows={1} value={activityDetails} onChange={(event) => setActivityDetails(event.target.value)} placeholder="O que foi combinado?" /></div>
              <Button className="min-h-12" disabled={timeline.createActivity.isPending} onClick={registerActivity}>Registrar</Button>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2"><History className="h-4 w-4 text-primary" /><h3 className="font-semibold">Histórico do cliente</h3></div>
            {timeline.isLoading ? <p className="text-sm text-muted-foreground">Carregando histórico...</p> : timeline.activities.length ? (
              <ol className="space-y-0 border-l border-primary/25 pl-5">
                {timeline.activities.map((activity) => (
                  <li key={activity.id} className="relative pb-5 last:pb-0">
                    <span className="absolute -left-[1.46rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div><p className="text-sm font-semibold">{activity.title}</p>{activity.details && <p className="mt-1 text-sm leading-5 text-muted-foreground">{activity.details}</p>}</div>
                      <time className="shrink-0 text-xs text-muted-foreground">{formatActivityDate(activity.occurred_at)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-muted-foreground">Nenhuma interação registrada.</p>}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function temperatureButtonClass(temperature: ClientTemperature, active: boolean) {
  const tone = temperature === "quente" ? "text-red-600" : temperature === "morno" ? "text-amber-600" : "text-sky-600";
  return `min-h-9 rounded-md px-2 text-xs font-semibold capitalize transition ${active ? `bg-card shadow-sm ${tone}` : "text-muted-foreground hover:text-foreground"}`;
}

function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return <div className="min-w-0 rounded-lg border bg-card p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4 text-primary" />{label}</div><p className="mt-2 truncate text-sm font-semibold">{value}</p></div>;
}

function budgetLabel(client: Client) {
  if (client.budget_min !== null && client.budget_max !== null) return `${formatCurrency(client.budget_min)} a ${formatCurrency(client.budget_max)}`;
  if (client.budget_max !== null) return `Até ${formatCurrency(client.budget_max)}`;
  if (client.budget_min !== null) return `A partir de ${formatCurrency(client.budget_min)}`;
  return "Não informada";
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
