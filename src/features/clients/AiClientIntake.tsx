import { useEffect, useState } from "react";
import { Bot, FileImage, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClientForm } from "./ClientForm";
import { analyzeClientIntake, type IntakeResult } from "./client-intake";
import type { ClientInput } from "./client-service";

export function AiClientIntake({ saving, onSave }: { saving?: boolean; onSave: (input: ClientInput) => Promise<void> }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [result, setResult] = useState<IntakeResult>();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => { if (!image) { setPreview(undefined); return; } const url = URL.createObjectURL(image); setPreview(url); return () => URL.revokeObjectURL(url); }, [image]);
  async function analyze() {
    setLoading(true); setProgress(0); setError("");
    try { setResult(await analyzeClientIntake(text, image, setProgress)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível analisar."); }
    finally { setLoading(false); }
  }
  if (result) return <div className="space-y-4"><div className="rounded-lg border border-primary/25 bg-primary/5 p-3"><p className="font-medium">Revise antes de salvar</p><p className="mt-1 text-sm text-muted-foreground">A IA pode interpretar algo errado. Confirme os campos abaixo.</p></div><ClientForm initial={result} saving={saving} onSave={onSave} /><Button variant="ghost" className="w-full" onClick={() => setResult(undefined)}>Voltar à conversa</Button></div>;
  return <div className="space-y-4">
    <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground"><Bot className="mb-2 h-5 w-5 text-primary" />Cole a conversa do WhatsApp ou envie um print. Os dados encontrados serão mostrados para revisão.</div>
    <div className="space-y-2"><Label htmlFor="client-conversation">Texto da conversa</Label><Textarea id="client-conversation" value={text} onChange={(event) => setText(event.target.value)} rows={8} placeholder={'Ex.: "Meu nome é Juliana, procuro apartamento de 3 quartos na Mooca até R$ 850 mil..."'} /></div>
    <div className="space-y-2"><Label>Print da conversa</Label>{preview ? <div className="relative overflow-hidden rounded-lg border"><img src={preview} alt="Print selecionado" className="max-h-56 w-full object-contain" /><Button variant="secondary" className="absolute right-2 top-2 h-10 w-10 p-0" aria-label="Remover print" onClick={() => setImage(undefined)}><X className="h-4 w-4" /></Button></div> : <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center hover:bg-muted"><FileImage className="mb-2 h-6 w-6 text-primary" /><span className="font-medium">Escolher print</span><span className="text-sm text-muted-foreground">JPG, PNG ou WebP até 5 MB</span><input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size <= 5_000_000) { setImage(file); setError(""); } else if (file) setError("A imagem deve ter até 5 MB."); }} /></label>}</div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {loading && image && <div className="space-y-2" aria-live="polite"><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${Math.max(8, Math.round(progress * 100))}%` }} /></div><p className="text-center text-xs text-muted-foreground">Lendo o print... {Math.round(progress * 100)}%</p></div>}
    <Button className="w-full" disabled={loading || (!text.trim() && !image)} onClick={analyze}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{loading ? "Analisando..." : "Analisar e preencher"}</Button>
  </div>;
}
