import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-context";
import { useProfile } from "@/features/profile/use-profile";
import { saveImageAsset } from "@/lib/image-assets";
import type { Profile } from "@/types/database";

export function ProfileForm({ compact = false, onSaved }: { compact?: boolean; onSaved?: () => void }) {
  const { user } = useAuth();
  const { profile, saveProfile } = useProfile();
  const { toast } = useToast();
  const [foto, setFoto] = useState(profile?.foto ?? "");
  const [logo, setLogo] = useState(profile?.logo ?? "");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [savingImages, setSavingImages] = useState(false);

  useEffect(() => setFoto(profile?.foto ?? ""), [profile?.foto]);
  useEffect(() => setLogo(profile?.logo ?? ""), [profile?.logo]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const form = new FormData(event.currentTarget);
    const payload: Partial<Profile> & { user_id: string } = {
      user_id: user.id,
      email: user.email ?? null,
      nome: String(form.get("nome") || "").trim(),
      foto: foto || null,
      logo: logo || null,
      nome_marca: String(form.get("nome_marca") || "").trim() || null,
      telefone: String(form.get("telefone") || "").trim() || null,
      whatsapp: String(form.get("whatsapp") || "").trim() || null,
      creci: String(form.get("creci") || "").trim(),
      cidade: String(form.get("cidade") || "").trim(),
      empresa: String(form.get("empresa") || "").trim(),
      horario_inicio: String(form.get("horario_inicio") || "08:00"),
      horario_fim: String(form.get("horario_fim") || "18:00"),
      meta_vendas_mensal: profile?.meta_vendas_mensal ?? 0,
      meta_vgv_mensal: profile?.meta_vgv_mensal ?? 0,
      meta_comissao_mensal: Number(form.get("meta_comissao_mensal") || 0)
    };

    try {
      setSavingImages(true);
      if (fotoFile) payload.foto = await saveImageAsset(fotoFile, user.id, "profile");
      if (logoFile) payload.logo = await saveImageAsset(logoFile, user.id, "brand");
      await saveProfile.mutateAsync(payload);
      setFoto(payload.foto ?? "");
      setLogo(payload.logo ?? "");
      setFotoFile(null);
      setLogoFile(null);
      toast({ title: "Perfil salvo." });
      onSaved?.();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Erro ao salvar perfil.", variant: "error" });
    } finally { setSavingImages(false); }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className={compact ? "grid gap-4" : "grid gap-4 md:grid-cols-2"}>
        <Field label="Nome" name="nome" defaultValue={profile?.nome ?? ""} required />
        <ImageUploadField label="Foto do corretor" value={foto} file={fotoFile} onFileChange={setFotoFile} onClear={() => setFoto("")} />
        <Field label="Nome da marca" name="nome_marca" defaultValue={profile?.nome_marca ?? ""} />
        <ImageUploadField label="Logo da marca" value={logo} file={logoFile} onFileChange={setLogoFile} onClear={() => setLogo("")} />
        <Field label="Telefone" name="telefone" defaultValue={profile?.telefone ?? ""} />
        <Field label="WhatsApp" name="whatsapp" defaultValue={profile?.whatsapp ?? ""} />
        <Field label="CRECI" name="creci" defaultValue={profile?.creci ?? ""} required />
        <Field label="Cidade" name="cidade" defaultValue={profile?.cidade ?? ""} required />
        <Field label="Empresa" name="empresa" defaultValue={profile?.empresa ?? ""} required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início" name="horario_inicio" type="time" defaultValue={profile?.horario_inicio?.slice(0, 5) ?? "08:00"} required />
          <Field label="Fim" name="horario_fim" type="time" defaultValue={profile?.horario_fim?.slice(0, 5) ?? "18:00"} required />
        </div>
        <Field label="Meta mensal de comissão" name="meta_comissao_mensal" type="number" defaultValue={String(profile?.meta_comissao_mensal ?? 50000)} required />
      </div>
      <Button disabled={saveProfile.isPending || savingImages} size="lg">
        {(saveProfile.isPending || savingImages) && <Loader2 className="h-4 w-4 animate-spin" />}
        {savingImages ? "Enviando imagens..." : "Salvar perfil"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={required} />
    </div>
  );
}
