import { useEffect, useMemo, useRef, useState } from "react";
import { Download, ExternalLink, FileImage, FileText, Film, FolderOpen, Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Condominium, CondominiumAsset, CondominiumAssetType } from "@/types/database";
import { useCondominiumAssets } from "./use-condominium-assets";

type MaterialFilter = CondominiumAssetType | "all";

const materialTypes = [
  { type: "photo" as const, label: "Fotos", action: "Subir fotos", icon: FileImage, accept: "image/*" },
  { type: "video" as const, label: "Vídeos", action: "Subir vídeos", icon: Film, accept: "video/*" },
  { type: "pdf" as const, label: "PDFs", action: "Subir PDF", icon: FileText, accept: "application/pdf" },
  { type: "drive" as const, label: "Drive", action: "Adicionar Drive", icon: FolderOpen }
];

export function CondominiumMaterialsDialog({ condominium, initialFilter = "all", onOpenChange }: { condominium?: Condominium; initialFilter?: MaterialFilter; onOpenChange: (open: boolean) => void }) {
  const { assets, isLoading, upload, addDrive, remove } = useCondominiumAssets(condominium?.id);
  const { toast } = useToast();
  const [filter, setFilter] = useState<MaterialFilter>(initialFilter);
  const [driveForm, setDriveForm] = useState(false);
  const [driveTitle, setDriveTitle] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [deleting, setDeleting] = useState<string>();
  const inputs = {
    photo: useRef<HTMLInputElement>(null),
    video: useRef<HTMLInputElement>(null),
    pdf: useRef<HTMLInputElement>(null)
  };

  useEffect(() => { setFilter(initialFilter); setDriveForm(initialFilter === "drive"); }, [initialFilter, condominium?.id]);
  const visible = useMemo(() => filter === "all" ? assets : assets.filter((asset) => asset.asset_type === filter), [assets, filter]);
  const busy = upload.isPending || addDrive.isPending;

  async function uploadFiles(type: "photo" | "video" | "pdf", files: FileList | null) {
    if (!condominium || !files?.length) return;
    try {
      for (const file of Array.from(files)) await upload.mutateAsync({ condominiumId: condominium.id, type, file });
      setFilter(type);
      toast({ title: files.length > 1 ? `${files.length} materiais adicionados.` : "Material adicionado." });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Não foi possível enviar o material." });
    }
  }

  async function saveDrive() {
    if (!condominium) return;
    try {
      await addDrive.mutateAsync({ condominiumId: condominium.id, title: driveTitle, url: driveUrl });
      setDriveTitle(""); setDriveUrl(""); setDriveForm(false); setFilter("drive");
      toast({ title: "Link do Drive adicionado." });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Não foi possível adicionar o link." });
    }
  }

  async function deleteAsset(asset: CondominiumAsset) {
    if (deleting !== asset.id) { setDeleting(asset.id); return; }
    try { await remove.mutateAsync(asset); setDeleting(undefined); toast({ title: "Material removido." }); }
    catch { toast({ title: "Não foi possível remover o material." }); }
  }

  async function downloadAsset(asset: CondominiumAsset) {
    if (!asset.asset_url) return;
    try {
      const response = await fetch(asset.asset_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = asset.file_name ?? asset.title; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { window.open(asset.asset_url, "_blank", "noopener,noreferrer"); }
  }

  return <Dialog open={Boolean(condominium)} onOpenChange={onOpenChange}>{condominium && <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
    <DialogHeader><DialogTitle className="text-xl">Materiais de {condominium.name}</DialogTitle><DialogDescription>Centralize fotos, vídeos, apresentações e pastas comerciais deste condomínio.</DialogDescription></DialogHeader>

    <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {materialTypes.map(({ type, action, icon: Icon, accept }) => <div key={type}>
        {type !== "drive" && <input ref={inputs[type]} className="hidden" type="file" accept={accept} multiple={type !== "pdf"} onChange={(event) => { void uploadFiles(type, event.target.files); event.target.value = ""; }} />}
        <button type="button" disabled={busy} onClick={() => type === "drive" ? setDriveForm((value) => !value) : inputs[type].current?.click()} className="flex min-h-24 w-full flex-col items-start justify-between rounded-2xl border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-muted/40 disabled:opacity-50">
          <span className="rounded-xl bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span><span className="mt-3 flex items-center gap-1.5 text-sm font-semibold">{action}<Plus className="h-3.5 w-3.5" /></span>
        </button>
      </div>)}
    </section>

    {driveForm && <section className="rounded-2xl border bg-muted/30 p-4"><div className="grid gap-3 sm:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)_auto]"><Input value={driveTitle} onChange={(event) => setDriveTitle(event.target.value)} placeholder="Nome da pasta" /><Input value={driveUrl} onChange={(event) => setDriveUrl(event.target.value)} placeholder="https://drive.google.com/..." inputMode="url" /><Button disabled={!driveUrl.trim() || addDrive.isPending} onClick={() => void saveDrive()}>{addDrive.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}Salvar</Button></div></section>}

    <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
      <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>Todos <span>{assets.length}</span></FilterButton>
      {materialTypes.map(({ type, label }) => <FilterButton key={type} active={filter === type} onClick={() => setFilter(type)}>{label} <span>{assets.filter((asset) => asset.asset_type === type).length}</span></FilterButton>)}
    </div>

    {busy && <div className="flex items-center gap-3 rounded-2xl border bg-primary/5 p-4 text-sm"><Loader2 className="h-5 w-5 animate-spin text-primary" /><span><strong>Enviando material</strong><span className="block text-xs text-muted-foreground">Mantenha esta janela aberta até concluir.</span></span></div>}
    {isLoading ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div> : visible.length ? <div className="space-y-2">{visible.map((asset) => <MaterialRow key={asset.id} asset={asset} confirmingDelete={deleting === asset.id} onDownload={() => void downloadAsset(asset)} onDelete={() => void deleteAsset(asset)} onCancelDelete={() => setDeleting(undefined)} />)}</div> : <div className="rounded-2xl border border-dashed px-5 py-10 text-center"><UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-semibold">Nenhum material nesta seção</p><p className="mt-1 text-sm text-muted-foreground">Use os botões acima para montar a biblioteca comercial.</p></div>}
  </DialogContent>}</Dialog>;
}

function MaterialRow({ asset, confirmingDelete, onDownload, onDelete, onCancelDelete }: { asset: CondominiumAsset; confirmingDelete: boolean; onDownload: () => void; onDelete: () => void; onCancelDelete: () => void }) {
  const config = materialTypes.find((item) => item.type === asset.asset_type)!;
  const Icon = config.icon;
  return <article className="flex items-center gap-3 rounded-2xl border bg-card p-3 sm:p-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted text-primary"><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{asset.title}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{config.label}{asset.file_size ? ` · ${formatBytes(asset.file_size)}` : ""}{asset.local_only ? " · neste dispositivo" : ""}</p></div><div className="flex shrink-0 items-center gap-1">
    {asset.asset_type === "drive" ? <Button size="icon" variant="outline" asChild title="Abrir no Drive"><a href={asset.external_url ?? "#"} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button> : <Button size="icon" variant="outline" onClick={onDownload} disabled={!asset.asset_url} title="Baixar material"><Download className="h-4 w-4" /></Button>}
    {confirmingDelete ? <><Button size="sm" variant="destructive" onClick={onDelete}>Excluir</Button><Button size="sm" variant="ghost" onClick={onCancelDelete}>Voltar</Button></> : <Button size="icon" variant="ghost" onClick={onDelete} title="Remover material"><Trash2 className="h-4 w-4" /></Button>}
  </div></article>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={cn("flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition", active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/35")}>{children}</button>; }
function formatBytes(value: number) { return value >= 1024 * 1024 ? `${(value / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(value / 1024))} KB`; }
