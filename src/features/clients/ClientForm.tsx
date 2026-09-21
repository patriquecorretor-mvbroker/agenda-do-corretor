import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Client, ClientStatus } from "@/types/database";
import type { ClientInput } from "./client-service";

export const clientStatuses: ClientStatus[] = ["lead", "em contato", "qualificado", "visita agendada", "proposta", "negociação", "venda realizada", "pós-venda", "perdido"];

export function ClientForm({ initial, saving, onSave }: { initial?: Partial<Client>; saving?: boolean; onSave: (input: ClientInput) => Promise<void> | void }) {
  const [status, setStatus] = useState<ClientStatus>(initial?.status ?? "lead");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const number = (name: string) => { const value = String(form.get(name) ?? ""); return value ? Number(value) : null; };
    await onSave({
      name: String(form.get("name") ?? "").trim(), phone: String(form.get("phone") ?? "").trim() || null, whatsapp: String(form.get("whatsapp") ?? "").trim() || null,
      email: String(form.get("email") ?? "").trim() || null, city: String(form.get("city") ?? "").trim() || null, neighborhood: String(form.get("neighborhood") ?? "").trim() || null,
      property_profile: String(form.get("property_profile") ?? "").trim() || null, budget_min: number("budget_min"), budget_max: number("budget_max"), bedrooms: number("bedrooms"),
      source: String(form.get("source") ?? "").trim() || null, notes: String(form.get("notes") ?? "").trim() || null, status,
      sale_date: String(form.get("sale_date") ?? "") || null, next_follow_up: String(form.get("next_follow_up") ?? "") || null
    });
  }
  return <form className="space-y-4" onSubmit={submit}>
    <div className="grid gap-3 sm:grid-cols-2"><FormField label="Nome" name="name" defaultValue={initial?.name} required /><FormField label="WhatsApp" name="whatsapp" defaultValue={initial?.whatsapp} inputMode="tel" /></div>
    <div className="grid gap-3 sm:grid-cols-2"><FormField label="Telefone" name="phone" defaultValue={initial?.phone} inputMode="tel" /><FormField label="E-mail" name="email" defaultValue={initial?.email} type="email" /></div>
    <div className="grid gap-3 sm:grid-cols-2"><FormField label="Cidade" name="city" defaultValue={initial?.city} /><FormField label="Bairro" name="neighborhood" defaultValue={initial?.neighborhood} /></div>
    <div className="grid gap-3 sm:grid-cols-2"><FormField label="Perfil do imóvel" name="property_profile" defaultValue={initial?.property_profile} placeholder="Ex.: apartamento, 3 quartos" /><FormField label="Quartos" name="bedrooms" defaultValue={initial?.bedrooms} type="number" min="0" /></div>
    <div className="grid gap-3 sm:grid-cols-2"><FormField label="Orçamento mínimo" name="budget_min" defaultValue={initial?.budget_min} type="number" min="0" /><FormField label="Orçamento máximo" name="budget_max" defaultValue={initial?.budget_max} type="number" min="0" /></div>
    <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>Etapa</Label><Select value={status} onValueChange={(value) => setStatus(value as ClientStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{clientStatuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><FormField label="Origem" name="source" defaultValue={initial?.source} placeholder="Instagram, indicação..." /></div>
    {(status === "venda realizada" || status === "pós-venda" || initial?.sale_date) && <div className="grid gap-3 sm:grid-cols-2"><FormField label="Data da venda" name="sale_date" defaultValue={initial?.sale_date} type="date" required /><FormField label="Próximo follow-up" name="next_follow_up" defaultValue={initial?.next_follow_up} type="date" /></div>}
    <div className="space-y-2"><Label htmlFor="client-notes">Observações</Label><Textarea id="client-notes" name="notes" defaultValue={initial?.notes ?? ""} rows={4} placeholder="Preferências, objeções e próximos passos" /></div>
    <Button className="w-full" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Salvar cliente</Button>
  </form>;
}

function FormField({ label, name, defaultValue, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "name"> & { label: string; name: string; defaultValue?: string | number | null }) {
  return <div className="space-y-2"><Label htmlFor={`client-${name}`}>{label}</Label><Input id={`client-${name}`} name={name} defaultValue={defaultValue == null ? "" : String(defaultValue)} {...props} /></div>;
}
