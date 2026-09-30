import { useEffect, useState } from "react";
import { Building2, Check, ExternalLink, Image as ImageIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Building } from "@/types/database";

const amenityOptions = ["Academia", "Acessibilidade", "Água quente", "Áreas sociais mobiliadas", "Bicicletário", "Brinquedoteca", "Churrasqueira", "Coworking", "Espaço gourmet", "Espaço kids", "Espaço pet", "Gás central", "Gerador", "Hall decorado", "Hidromassagem", "Jacuzzi", "Jardim", "Pet place", "Piscina", "Piscina aquecida", "Piscina com borda infinita", "Playground", "Portaria 24h", "Portaria eletrônica", "Quadra esportiva", "Rooftop", "Sala de cinema", "Sala de jogos", "Salão de festas", "Sauna", "Segurança 24h", "Solarium", "Varanda", "Vista para o mar", "Zeladoria"];

export function BuildingFormDialog({ open, building, onOpenChange, onSave }: { open: boolean; building: Building; onOpenChange: (open: boolean) => void; onSave: (building: Building) => Promise<void> }) {
  const [draft, setDraft] = useState(building);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(building), [building]);

  const set = <K extends keyof Building>(key: K, value: Building[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const number = (value: string) => value === "" ? null : Number(value);
  const toggleAmenity = (item: string) => set("amenities", draft.amenities?.includes(item) ? draft.amenities.filter((value) => value !== item) : [...(draft.amenities ?? []), item]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.street.trim() || !draft.neighborhood.trim()) return;
    setSaving(true);
    try { await onSave({ ...draft, name: draft.name.trim(), street: draft.street.trim(), neighborhood: draft.neighborhood.trim() }); onOpenChange(false); }
    finally { setSaving(false); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-3xl">
      <DialogHeader className="pr-10"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></span><div><DialogTitle>{building.name ? "Editar edifício" : "Novo edifício"}</DialogTitle><DialogDescription>Ficha comercial e técnica do empreendimento.</DialogDescription></div></div></DialogHeader>
      <form onSubmit={submit} className="space-y-6">
        <FormSection title="Identificação">
          <Field label="Nome do edifício" required className="sm:col-span-2"><Input value={draft.name} onChange={(event) => set("name", event.target.value)} placeholder="Ex.: Via Del Mare" /></Field>
          <Field label="Rua" required><Input value={draft.street} onChange={(event) => set("street", event.target.value)} /></Field>
          <Field label="Número"><Input value={draft.number ?? ""} onChange={(event) => set("number", event.target.value || null)} /></Field>
          <Field label="Bairro" required><Input value={draft.neighborhood} onChange={(event) => set("neighborhood", event.target.value)} /></Field>
          <Field label="CEP"><Input value={draft.postalCode ?? ""} onChange={(event) => set("postalCode", event.target.value || null)} /></Field>
          <Field label="Cidade"><Input value={draft.city ?? ""} onChange={(event) => set("city", event.target.value)} /></Field>
          <Field label="Estado"><Input value={draft.state ?? ""} maxLength={2} onChange={(event) => set("state", event.target.value.toUpperCase())} /></Field>
        </FormSection>

        <FormSection title="Empreendimento">
          <Field label="Construtora"><Input value={draft.builder ?? ""} onChange={(event) => set("builder", event.target.value || null)} /></Field>
          <Field label="Incorporadora"><Input value={draft.developer ?? ""} onChange={(event) => set("developer", event.target.value || null)} /></Field>
          <Numeric label="Ano da construção" value={draft.constructionYear} onChange={(value) => set("constructionYear", number(value))} />
          <Numeric label="Ano de entrega" value={draft.deliveryYear} onChange={(value) => set("deliveryYear", number(value))} />
          <Numeric label="Torres" value={draft.towers} onChange={(value) => set("towers", number(value))} />
          <Numeric label="Andares" value={draft.floors} onChange={(value) => set("floors", number(value))} />
          <Numeric label="Unidades totais" value={draft.totalUnits} onChange={(value) => set("totalUnits", number(value))} />
          <Numeric label="Unidades por andar" value={draft.unitsPerFloor} onChange={(value) => set("unitsPerFloor", number(value))} />
          <Numeric label="Elevadores" value={draft.elevators} onChange={(value) => set("elevators", number(value))} />
          <Numeric label="Vagas" value={draft.parkingSpaces} onChange={(value) => set("parkingSpaces", number(value))} />
        </FormSection>

        <FormSection title="Apartamentos">
          <Numeric label="Dormitórios mínimos" value={draft.bedroomsMin} onChange={(value) => set("bedroomsMin", number(value))} />
          <Numeric label="Dormitórios máximos" value={draft.bedroomsMax} onChange={(value) => set("bedroomsMax", number(value))} />
          <Numeric label="Área mínima (m²)" value={draft.privateAreaMin} step="0.01" onChange={(value) => set("privateAreaMin", number(value))} />
          <Numeric label="Área máxima (m²)" value={draft.privateAreaMax} step="0.01" onChange={(value) => set("privateAreaMax", number(value))} />
        </FormSection>

        <div><p className="mb-3 text-sm font-semibold">Infraestrutura</p><div className="flex flex-wrap gap-2">{amenityOptions.map((item) => <button key={item} type="button" onClick={() => toggleAmenity(item)} className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition", draft.amenities?.includes(item) ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}><Check className={cn("h-3.5 w-3.5", !draft.amenities?.includes(item) && "opacity-0")} />{item}</button>)}</div></div>

        <FormSection title="Apresentação">
          <Field label="URL da foto de capa" className="sm:col-span-2"><div className="relative"><ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-10" value={draft.coverUrl ?? ""} onChange={(event) => set("coverUrl", event.target.value || null)} placeholder="https://..." /></div></Field>
          <Field label="Site do empreendimento"><Input value={draft.websiteUrl ?? ""} onChange={(event) => set("websiteUrl", event.target.value || null)} /></Field>
          <Field label="Descrição" className="sm:col-span-2"><Textarea value={draft.description ?? ""} onChange={(event) => set("description", event.target.value || null)} /></Field>
          <Field label="Observações internas" className="sm:col-span-2"><Textarea value={draft.notes ?? ""} onChange={(event) => set("notes", event.target.value || null)} /></Field>
        </FormSection>

        <section className="rounded-2xl border bg-muted/25 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Informações públicas</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Registre apenas dados publicados e deixe campos não confirmados em branco.</p></div><Button type="button" variant="outline" size="sm" asChild><a href={`https://www.google.com/search?q=${encodeURIComponent(`${draft.name} ${draft.city || "Capão da Canoa"} edifício construtora`)}`} target="_blank" rel="noreferrer"><Search className="h-4 w-4" />Pesquisar na internet</a></Button></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Situação da ficha"><Select value={draft.verificationStatus ?? "pendente"} onValueChange={(value) => set("verificationStatus", value as Building["verificationStatus"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">A completar</SelectItem><SelectItem value="web">Dados públicos encontrados</SelectItem><SelectItem value="verificado">Verificado em fonte oficial</SelectItem><SelectItem value="manual">Cadastro manual</SelectItem></SelectContent></Select></Field><Field label="Data da consulta"><Input type="date" value={draft.sourceCheckedAt ?? ""} onChange={(event) => set("sourceCheckedAt", event.target.value || null)} /></Field><Field label="Link público"><div className="relative"><ExternalLink className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-10" value={draft.sourceUrl ?? ""} onChange={(event) => set("sourceUrl", event.target.value || null)} placeholder="https://..." /></div></Field><Field label="Identificação da consulta"><Input value={draft.sourceTitle ?? ""} onChange={(event) => set("sourceTitle", event.target.value || null)} placeholder="Ex.: site da construtora" /></Field></div></section>

        <div className="sticky bottom-0 -mx-5 flex gap-3 border-t bg-background/95 px-5 pb-1 pt-4 backdrop-blur sm:static sm:mx-0 sm:justify-end sm:border-0 sm:p-0"><Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" className="flex-1 sm:flex-none" disabled={saving || !draft.name.trim() || !draft.street.trim() || !draft.neighborhood.trim()}>{saving ? "Salvando..." : "Salvar edifício"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) { return <section><p className="mb-3 text-sm font-semibold">{title}</p><div className="grid gap-4 sm:grid-cols-2">{children}</div></section>; }
function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) { return <div className={className}><Label>{label}{required ? " *" : ""}</Label><div className="mt-1.5">{children}</div></div>; }
function Numeric({ label, value, step = "1", onChange }: { label: string; value?: number | null; step?: string; onChange: (value: string) => void }) { return <Field label={label}><Input type="number" min="0" step={step} value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></Field>; }
