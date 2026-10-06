import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";

const bucket = "broker-images";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxSize = 5_000_000;

export function validateImage(file: File) {
  if (!allowedTypes.has(file.type)) throw new Error("Escolha uma foto JPG, PNG ou WebP.");
  if (file.size > maxSize) throw new Error("A foto deve ter até 5 MB.");
}

export async function saveImageAsset(file: File, userId: string, folder: string): Promise<string> {
  validateImage(file);
  if (!hasSupabaseConfig) return compressedDataUrl(file);

  const path = `${userId}/${folder}/${crypto.randomUUID()}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`;
  const storage = requireSupabase().storage.from(bucket);
  const { error } = await storage.upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
  if (error) throw error;
  return storage.getPublicUrl(path).data.publicUrl;
}

function compressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      try {
        const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Não foi possível preparar a imagem.");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      } catch (error) { reject(error); }
      finally { URL.revokeObjectURL(url); }
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível abrir esta imagem.")); };
    image.src = url;
  });
}
