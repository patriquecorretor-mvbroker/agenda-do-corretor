import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Condominium } from "@/types/database";

export function CondominiumFormDialog({ open, condominium, onOpenChange, onSave }: { open: boolean; condominium: Condominium; onOpenChange: (open: boolean) => void; onSave: (value: Condominium) => Promise<void> }) {
  const [status, setStatus] = useState(condominium.status);
  const [city, setCity] = useState(condominium.city);
  const [unitType, setUnitType] = useState(condominium.unitType);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const number = (key: string) => form.get(key) ? Number(form.get(key)) : null;
    setSaving(true);
    try {
      await onSave({
        ...condominium,
        name: String(form.get("name") || "").trim(), city, neighborhood: String(form.get("neighborhood") || "").trim() || null,
        status, developer: String(form.get("developer") || "").trim() || null, launchYear: number("launchYear"),
        totalUnits: number("totalUnits"), areaHa: number("areaHa"), unitType, areaMin: number("areaMin"), areaMax: number("areaMax"),
        hasBeachClub: form.get("hasBeachClub") === "on", amenities: String(form.get("amenities") || "").split(",").map((item) => item.trim()).filter(Boolean),
        description: String(form.get("description") || "").trim() || null, coverUrl: String(form.get("coverUrl") || "").trim() || null,
        notes: String(form.get("notes") || "").trim() || null, verificationStatus: "manual"
      });
      onOpenChange(false);
    } finally { setSaving(false); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-2xl">
    <DialogHeader><DialogTitle>{condominium.name ? "Editar condomínio" : "Novo condomínio"}</DialogTitle><DialogDescription>Cadastre a ficha comercial. Campos desconhecidos podem ficar em branco.</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome" className="sm:col-span-2"><Input name="name" defaultValue={condominium.name} required placeholder="Nome do condomínio" /></Field>
      <Field label="Cidade"><Select value={city} onValueChange={setCity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Capão da Canoa">Capão da Canoa</SelectItem><SelectItem value="Xangri-Lá">Xangri-Lá</SelectItem></SelectContent></Select></Field>
      <Field label="Bairro"><Input name="neighborhood" defaultValue={condominium.neighborhood ?? ""} /></Field>
      <Field label="Situação"><Select value={status} onValueChange={(value) => setStatus(value as Condominium["status"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["entregue", "em obras", "lançamento", "a confirmar"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Construtora / incorporadora"><Input name="developer" defaultValue={condominium.developer ?? ""} /></Field>
      <Field label="Ano de lançamento"><Input name="launchYear" type="number" defaultValue={condominium.launchYear ?? ""} /></Field>
      <Field label="Unidades"><Input name="totalUnits" type="number" defaultValue={condominium.totalUnits ?? ""} /></Field>
      <Field label="Área total (ha)"><Input name="areaHa" type="number" step="0.1" defaultValue={condominium.areaHa ?? ""} /></Field>
      <Field label="Tipologia"><Select value={unitType} onValueChange={(value) => setUnitType(value as Condominium["unitType"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["lotes", "casas", "apartamentos", "misto", "não informado"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Metragem mínima (m²)"><Input name="areaMin" type="number" defaultValue={condominium.areaMin ?? ""} /></Field>
      <Field label="Metragem máxima (m²)"><Input name="areaMax" type="number" defaultValue={condominium.areaMax ?? ""} /></Field>
      <Field label="Infraestrutura" className="sm:col-span-2"><Input name="amenities" defaultValue={condominium.amenities.join(", ")} placeholder="Clube, piscina, quadras..." /></Field>
      <label className="flex items-center gap-3 rounded-2xl border p-4 text-sm font-medium sm:col-span-2"><input type="checkbox" name="hasBeachClub" defaultChecked={condominium.hasBeachClub} className="h-5 w-5 accent-primary" />Possui paradouro / clube de praia</label>
      <Field label="Descrição" className="sm:col-span-2"><textarea name="description" defaultValue={condominium.description ?? ""} className="min-h-24 w-full rounded-2xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></Field>
      <Field label="URL da capa" className="sm:col-span-2"><Input name="coverUrl" type="url" defaultValue={condominium.coverUrl ?? ""} placeholder="https://..." /></Field>
      <Field label="Observações" className="sm:col-span-2"><Input name="notes" defaultValue={condominium.notes ?? ""} /></Field>
      <div className="sticky bottom-0 -mx-5 -mb-5 grid grid-cols-2 gap-2 border-t bg-background p-5 sm:col-span-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar condomínio"}</Button></div>
    </form>
  </DialogContent></Dialog>;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-2 ${className}`}><Label>{label}</Label>{children}</div>;
}
