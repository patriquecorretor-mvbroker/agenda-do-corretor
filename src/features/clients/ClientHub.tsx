import { useState } from "react";
import { Bot, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { AiClientIntake } from "./AiClientIntake";
import { ClientForm } from "./ClientForm";
import { ClientDetailDialog } from "./ClientDetailDialog";
import { ClientPipeline } from "./ClientPipeline";
import { useClients } from "./use-clients";
import type { Client, ClientStatus } from "@/types/database";
import type { ClientInput } from "./client-service";

export function ClientHub() {
  const crm = useClients();
  const { toast } = useToast();
  const [mode, setMode] = useState<"manual" | "ai" | null>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [editing, setEditing] = useState<Client>();
  const selected = crm.clients.find((client) => client.id === selectedId);
  async function create(input: ClientInput) { try { await crm.createClient.mutateAsync(withAnniversaryFollowUp(input)); setMode(null); toast({ title: "Cliente cadastrado." }); } catch (error) { toast({ title: error instanceof Error ? error.message : "Não foi possível salvar.", variant: "error" }); } }
  async function edit(input: ClientInput) { if (!editing) return; try { await crm.updateClient.mutateAsync({ id: editing.id, input: withAnniversaryFollowUp(input), previousStatus: editing.status }); setEditing(undefined); toast({ title: "Cliente atualizado." }); } catch { toast({ title: "Não foi possível atualizar.", variant: "error" }); } }
  async function status(client: Client, next: ClientStatus) { if (next === "venda realizada" && !client.sale_date) { setSelectedId(undefined); setEditing(client); toast({ title: "Informe a data da venda para concluir esta etapa." }); return false; } try { await crm.updateClient.mutateAsync({ id: client.id, input: { status: next }, previousStatus: client.status }); toast({ title: `${client.name}: ${next}.` }); return true; } catch { toast({ title: "Não foi possível alterar a etapa.", variant: "error" }); return false; } }
  async function followUp(client: Client, date: string | null) { try { await crm.updateClient.mutateAsync({ id: client.id, input: { next_follow_up: date }, previousStatus: client.status }); return true; } catch { toast({ title: "Não foi possível atualizar o follow-up.", variant: "error" }); return false; } }
  return <Card className="order-2 overflow-hidden border-primary/20">
    <CardHeader className="gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><CardTitle>Processo de vendas</CardTitle><p className="mt-1 text-sm text-muted-foreground">Acompanhe cada cliente até o pós-venda.</p></div><div className="grid w-full grid-cols-2 gap-2 sm:w-auto"><Button className="min-h-11 px-2" variant="outline" onClick={() => setMode("ai")}><Bot className="h-4 w-4" />Com IA</Button><Button className="min-h-11 px-2" onClick={() => setMode("manual")}><Plus className="h-4 w-4" />Novo cliente</Button></div></CardHeader>
    <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">{crm.isLoading ? <div className="grid min-h-48 place-items-center text-muted-foreground">Carregando clientes...</div> : crm.error ? <div className="grid min-h-48 place-items-center text-destructive">Não foi possível carregar os clientes.</div> : crm.clients.length ? <ClientPipeline clients={crm.clients} onEdit={(client) => setSelectedId(client.id)} onStatus={status} /> : <div className="grid min-h-56 place-items-center rounded-lg border border-dashed p-6 text-center"><div><Users className="mx-auto mb-3 h-7 w-7 text-primary" /><p className="font-medium">Sua carteira começa aqui</p><p className="mt-1 text-sm text-muted-foreground">Cadastre manualmente ou deixe a IA preencher a partir de uma conversa.</p><Button className="mt-4" onClick={() => setMode("ai")}><Bot className="h-4 w-4" />Cadastrar primeiro cliente</Button></div></div>}</CardContent>
    <Dialog open={mode !== null} onOpenChange={(open) => !open && setMode(null)}><DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{mode === "ai" ? "Cadastro com IA" : "Novo cliente"}</DialogTitle><DialogDescription>{mode === "ai" ? "Envie a conversa e revise os dados encontrados." : "Informações para acompanhar a jornada de compra."}</DialogDescription></DialogHeader>{mode === "ai" ? <AiClientIntake saving={crm.createClient.isPending} onSave={create} /> : <ClientForm saving={crm.createClient.isPending} onSave={create} />}</DialogContent></Dialog>
    <ClientDetailDialog client={selected} open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(undefined)} onEdit={(client) => { setSelectedId(undefined); setEditing(client); }} onStatus={status} onFollowUp={followUp} />
    <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(undefined)}>{editing && <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editing.name}</DialogTitle><DialogDescription>Atualize etapa, follow-up e informações do cliente.</DialogDescription></DialogHeader><ClientForm initial={editing} saving={crm.updateClient.isPending} onSave={edit} /></DialogContent>}</Dialog>
  </Card>;
}

function withAnniversaryFollowUp(input: ClientInput): ClientInput {
  if (!input.sale_date || input.next_follow_up || !["venda realizada", "pós-venda"].includes(input.status ?? "")) return input;
  const sale = new Date(`${input.sale_date}T12:00:00`);
  const today = new Date();
  let anniversary = new Date(today.getFullYear(), sale.getMonth(), sale.getDate(), 12);
  if (anniversary <= today) anniversary = new Date(today.getFullYear() + 1, sale.getMonth(), sale.getDate(), 12);
  return { ...input, next_follow_up: anniversary.toISOString().slice(0, 10) };
}
