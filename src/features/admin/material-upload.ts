export type MaterialFileLike = Pick<File, "name" | "size" | "type">;
export type UploadMaterialType = "image" | "video" | "pdf";

const acceptedMimeTypes: Record<string, { materialType: UploadMaterialType; maxBytes: number }> = {
  "image/jpeg": { materialType: "image", maxBytes: 20_000_000 },
  "image/png": { materialType: "image", maxBytes: 20_000_000 },
  "image/webp": { materialType: "image", maxBytes: 20_000_000 },
  "video/mp4": { materialType: "video", maxBytes: 200_000_000 },
  "video/quicktime": { materialType: "video", maxBytes: 200_000_000 },
  "application/pdf": { materialType: "pdf", maxBytes: 20_000_000 }
};

export function validateMaterialFile(file: MaterialFileLike) {
  const rule = acceptedMimeTypes[file.type];
  if (!rule) throw new Error("Formato não aceito. Use JPG, PNG, WebP, MP4, MOV ou PDF.");
  if (file.size <= 0) throw new Error("O arquivo selecionado está vazio.");
  if (file.size > rule.maxBytes) throw new Error(`Arquivo maior que o limite de ${Math.round(rule.maxBytes / 1_000_000)} MB.`);
  return rule.materialType;
}

export function sanitizeMaterialFileName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "material";
}

export function readMaterialAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}
