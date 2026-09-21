import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import type { ClientInput } from "./client-service";

export type IntakeResult = ClientInput & { confidence?: Record<string, number> };

function cleanPhone(value?: string) { return value?.replace(/[^\d+]/g, "") || null; }
function money(value?: string) { return value ? Number(value.replace(/\./g, "").replace(",", ".")) || null : null; }

type OcrWorker = { recognize(image: File): Promise<{ data: { text: string } }>; terminate(): Promise<void> };
type TesseractApi = { createWorker(language: string, engine: number, options: Record<string, unknown>): Promise<OcrWorker> };

export async function analyzeClientIntake(text: string, image?: File, onProgress?: (progress: number) => void): Promise<IntakeResult> {
  if (hasSupabaseConfig) {
    const imageData = image ? await fileDataUrl(image) : undefined;
    const { data, error } = await (requireSupabase() as any).functions.invoke("client-intake-ai", { body: { text, image: imageData } });
    if (error) throw new Error("A análise por IA não está configurada. Você ainda pode usar o cadastro manual.");
    return data as IntakeResult;
  }
  const extracted = image ? await readScreenshot(image, onProgress) : "";
  return parseConversation([text, extracted].filter(Boolean).join("\n"));
}

function parseConversation(text: string): IntakeResult {
  const normalized = text.replace(/\r/g, "").trim();
  if (normalized.length < 8) throw new Error("Cole uma conversa com informações do cliente.");
  const phone = normalized.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}/)?.[0];
  const email = normalized.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0];
  const budget = normalized.match(/(?:até|orcamento|orçamento|valor|faixa)\s*(?:de\s*)?(?:r\$\s*)?([\d.]+(?:,\d{1,2})?)/i)?.[1];
  const bedrooms = normalized.match(/(\d+)\s*(?:quartos?|dormitórios?|dorms?)/i)?.[1];
  const city = normalized.match(/(?:cidade|moro em|procuro em|região de)[:\s]+([^\n,.]{3,40})/i)?.[1]?.trim();
  const neighborhood = normalized.match(/(?:bairro|região)[:\s]+([^\n,.]{3,40})/i)?.[1]?.trim();
  const explicitName = normalized.match(/(?:meu nome é|sou o|sou a|cliente[:\s]+)([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+){1,3})/i)?.[1];
  const firstSpeaker = normalized.match(/^([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+){1,3})\s*:/)?.[1];
  const profile = normalized.match(/\b(apartamento|casa|studio|terreno|sobrado|cobertura|loft)(?:[^\n,.]{0,45})/i)?.[0];
  return { name: explicitName ?? firstSpeaker ?? "Cliente sem nome", phone: cleanPhone(phone), whatsapp: cleanPhone(phone), email: email ?? null, city: city ?? null, neighborhood: neighborhood ?? null, property_profile: profile ?? null, budget_max: money(budget), bedrooms: bedrooms ? Number(bedrooms) : null, notes: normalized.slice(0, 3000), source: "Conversa analisada", status: "lead", confidence: { name: explicitName || firstSpeaker ? 0.75 : 0.2, phone: phone ? 0.9 : 0, city: city ? 0.65 : 0 } };
}

function fileDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
}

let tesseractPromise: Promise<TesseractApi> | undefined;
function loadTesseract() {
  if (!tesseractPromise) tesseractPromise = new Promise<TesseractApi>((resolve, reject) => {
    const existing = (window as unknown as { Tesseract?: TesseractApi }).Tesseract;
    if (existing) { resolve(existing); return; }
    const script = document.createElement("script");
    script.src = "/vendor/tesseract/tesseract.min.js";
    script.onload = () => resolve((window as unknown as { Tesseract: TesseractApi }).Tesseract);
    script.onerror = () => { tesseractPromise = undefined; reject(new Error("Não foi possível carregar a leitura do print.")); };
    document.head.appendChild(script);
  });
  return tesseractPromise;
}

async function readScreenshot(image: File, onProgress?: (progress: number) => void) {
  const Tesseract = await loadTesseract();
  const worker = await Tesseract.createWorker("por", 1, {
    workerPath: "/vendor/tesseract/worker.min.js",
    corePath: "/vendor/tesseract/tesseract-core-simd-lstm.wasm.js",
    langPath: "/vendor/tesseract/lang",
    logger: (message: { progress?: number }) => { if (typeof message.progress === "number") onProgress?.(message.progress); }
  });
  try { const result = await worker.recognize(image); return result.data.text; }
  finally { await worker.terminate(); }
}
