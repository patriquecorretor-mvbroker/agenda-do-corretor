import { useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { validateImage } from "@/lib/image-assets";

export function ImageUploadField({ label, value, file, onFileChange, onClear, className = "" }: {
  label: string;
  value?: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onClear?: () => void;
  className?: string;
}) {
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return <div className={`space-y-2 ${className}`}>
    <Label>{label}</Label>
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-dashed bg-card p-3">
      {preview || value ? <img src={preview || value || ""} alt={`Prévia de ${label.toLowerCase()}`} className="h-16 w-20 shrink-0 rounded-lg object-cover" /> : <span className="grid h-16 w-20 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><ImagePlus className="h-6 w-6" /></span>}
      <div className="min-w-0 flex-1">
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border bg-background px-3 text-sm font-semibold hover:bg-muted">
          {preview || value ? "Trocar foto" : "Escolher foto"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => {
            const selected = event.target.files?.[0];
            event.target.value = "";
            if (!selected) return;
            try { validateImage(selected); onFileChange(selected); }
            catch (error) { toast({ title: error instanceof Error ? error.message : "Foto inválida.", variant: "error" }); }
          }} />
        </label>
        <p className="mt-1 text-xs text-muted-foreground">JPG, PNG ou WebP, até 5 MB</p>
      </div>
      {(preview || value) && onClear && <Button type="button" size="icon" variant="ghost" title="Remover foto" aria-label="Remover foto" onClick={() => { onFileChange(null); onClear(); }}><X className="h-4 w-4" /></Button>}
    </div>
  </div>;
}
