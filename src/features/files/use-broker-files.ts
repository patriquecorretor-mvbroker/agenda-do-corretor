import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-context";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import type { BrokerFile, BrokerFileType } from "@/types/database";

const bucket = "broker-files";
const databaseName = "agenda-corretor-files";
const storeName = "files";

type UploadInput = { file: File; title?: string; category: string; folder: string; clientId?: string | null; clientName?: string | null; tags?: string[] };
type LinkInput = { title: string; url: string; category: string; folder: string; clientId?: string | null; clientName?: string | null; tags?: string[] };
type LocalRecord = { id: string; asset: BrokerFile; blob?: Blob };

export function useBrokerFiles(clientId?: string | null) {
  const { user } = useAuth();
  const userId = user?.id ?? "local-user";
  const queryClient = useQueryClient();
  const key = ["broker-files", userId] as const;
  const query = useQuery({ queryKey: key, queryFn: () => listFiles(userId), staleTime: 30_000 });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const upload = useMutation({ mutationFn: async (input: UploadInput) => {
    validateFile(input.file);
    if (hasSupabaseConfig && user) {
      try { return await remoteUpload(userId, input); } catch { return localUpload(userId, input); }
    }
    return localUpload(userId, input);
  }, onSuccess: refresh });

  const addLink = useMutation({ mutationFn: async (input: LinkInput) => {
    const normalized = { ...input, url: normalizeUrl(input.url) };
    if (hasSupabaseConfig && user) {
      try { return await remoteAddLink(userId, normalized); } catch { return localAddLink(userId, normalized); }
    }
    return localAddLink(userId, normalized);
  }, onSuccess: refresh });

  const remove = useMutation({ mutationFn: async (asset: BrokerFile) => {
    if (hasSupabaseConfig && user && !asset.local_only) await remoteRemove(userId, asset);
    else await localRemove(asset.id);
  }, onSuccess: refresh });

  const updateMeta = useMutation({ mutationFn: async ({ asset, changes }: { asset: BrokerFile; changes: Partial<Pick<BrokerFile, "folder" | "is_favorite">> }) => {
    if (hasSupabaseConfig && user && !asset.local_only) return remoteUpdateMeta(userId, asset.id, changes);
    return localUpdateMeta(asset.id, changes);
  }, onSuccess: refresh });

  const all = query.data ?? [];
  return { files: clientId ? all.filter((file) => file.client_id === clientId) : all, allFiles: all, isLoading: query.isLoading, error: query.error, upload, addLink, remove, updateMeta };
}

async function listFiles(userId: string) {
  const local = await localList();
  if (!hasSupabaseConfig || userId === "local-user") return local;
  try {
    const remote = await remoteList(userId);
    return [...remote, ...local.filter((item) => !remote.some((saved) => saved.id === item.id))];
  } catch { return local; }
}

async function remoteList(userId: string): Promise<BrokerFile[]> {
  const client = requireSupabase() as any;
  const { data, error } = await client.from("broker_files").select("*,clients(name)").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map(async (row: any) => {
    const asset = { folder: "Geral", is_favorite: false, ...row, client_name: row.clients?.name ?? null } as BrokerFile;
    delete (asset as any).clients;
    if (!asset.storage_path) return asset;
    const { data: signed } = await client.storage.from(bucket).createSignedUrl(asset.storage_path, 3600);
    return { ...asset, file_url: signed?.signedUrl };
  }));
}

async function remoteUpload(userId: string, input: UploadInput) {
  const client = requireSupabase() as any;
  const id = crypto.randomUUID();
  const path = `${userId}/${input.clientId ? `clients/${safeName(input.clientId)}` : "general"}/${id}-${safeName(input.file.name)}`;
  const { error: storageError } = await client.storage.from(bucket).upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (storageError) throw storageError;
  const row = fileRecord(userId, id, input, path);
  const { data, error } = await client.from("broker_files").insert(row).select("*").single();
  if (error) { await client.storage.from(bucket).remove([path]); throw error; }
  return data;
}

async function remoteAddLink(userId: string, input: LinkInput) {
  const client = requireSupabase() as any;
  const row = linkRecord(userId, crypto.randomUUID(), input);
  const { data, error } = await client.from("broker_files").insert(row).select("*").single();
  if (error) throw error;
  return data;
}

async function remoteRemove(userId: string, asset: BrokerFile) {
  const client = requireSupabase() as any;
  if (asset.storage_path) {
    const { error: storageError } = await client.storage.from(bucket).remove([asset.storage_path]);
    if (storageError) throw storageError;
  }
  const { error } = await client.from("broker_files").delete().eq("id", asset.id).eq("user_id", userId);
  if (error) throw error;
}

async function remoteUpdateMeta(userId: string, id: string, changes: Partial<Pick<BrokerFile, "folder" | "is_favorite">>) {
  const client = requireSupabase() as any;
  const { data, error } = await client.from("broker_files").update(changes).eq("id", id).eq("user_id", userId).select("*").single();
  if (error) throw error;
  return data;
}

async function localList(): Promise<BrokerFile[]> {
  const records = await allLocal();
  return records.sort((a, b) => b.asset.created_at.localeCompare(a.asset.created_at)).map((record) => ({ ...record.asset, folder: record.asset.folder ?? "Geral", is_favorite: record.asset.is_favorite ?? false, file_url: record.blob ? URL.createObjectURL(record.blob) : undefined, local_only: true }));
}

async function localUpload(userId: string, input: UploadInput) {
  const id = crypto.randomUUID();
  const asset = { ...fileRecord(userId, id, input, id), client_name: input.clientName ?? null, local_only: true };
  await putLocal({ id, asset, blob: input.file });
  return asset;
}

async function localAddLink(userId: string, input: LinkInput) {
  const id = crypto.randomUUID();
  const asset = { ...linkRecord(userId, id, input), client_name: input.clientName ?? null, local_only: true };
  await putLocal({ id, asset });
  return asset;
}

async function localRemove(id: string) { const database = await openDatabase(); await transactionPromise(database, "readwrite", (store) => store.delete(id)); }
async function localUpdateMeta(id: string, changes: Partial<Pick<BrokerFile, "folder" | "is_favorite">>) { const database = await openDatabase(); const record = await requestPromise<LocalRecord | undefined>(database.transaction(storeName).objectStore(storeName).get(id)); if (!record) throw new Error("Arquivo não encontrado."); await putLocal({ ...record, asset: { ...record.asset, ...changes, updated_at: new Date().toISOString() } }); return { ...record.asset, ...changes }; }

function fileRecord(userId: string, id: string, input: UploadInput, path: string): BrokerFile {
  const now = new Date().toISOString();
  const fileType: BrokerFileType = input.file.type.startsWith("image/") ? "image" : "pdf";
  return { id, user_id: userId, client_id: input.clientId ?? null, title: input.title?.trim() || titleFromName(input.file.name), category: input.category.trim() || "Geral", folder: input.folder.trim() || "Geral", is_favorite: false, file_type: fileType, file_name: input.file.name, storage_path: path, external_url: null, mime_type: input.file.type || null, file_size: input.file.size, tags: input.tags ?? [], created_at: now, updated_at: now };
}

function linkRecord(userId: string, id: string, input: LinkInput): BrokerFile {
  const now = new Date().toISOString();
  return { id, user_id: userId, client_id: input.clientId ?? null, title: input.title.trim(), category: input.category.trim() || "Links", folder: input.folder.trim() || "Geral", is_favorite: false, file_type: "link", file_name: null, storage_path: null, external_url: input.url, mime_type: null, file_size: null, tags: input.tags ?? [], created_at: now, updated_at: now };
}

function validateFile(file: File) {
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isImage && !isPdf) throw new Error("Envie uma foto ou arquivo PDF.");
  const max = isImage ? 20 * 1024 * 1024 : 30 * 1024 * 1024;
  if (file.size > max) throw new Error(`O arquivo excede o limite de ${formatBytes(max)}.`);
}

function normalizeUrl(value: string) { const url = new URL(value.trim()); if (!["https:", "http:"].includes(url.protocol)) throw new Error("Informe um link válido."); return url.toString(); }
function titleFromName(value: string) { return value.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Arquivo"; }
function safeName(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "").slice(0, 90); }
export function formatBytes(value: number) { return value >= 1024 * 1024 ? `${(value / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(value / 1024))} KB`; }
function openDatabase() { return new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open(databaseName, 1); request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName, { keyPath: "id" }); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function allLocal() { const database = await openDatabase(); return requestPromise<LocalRecord[]>(database.transaction(storeName).objectStore(storeName).getAll()); }
async function putLocal(record: LocalRecord) { const database = await openDatabase(); await transactionPromise(database, "readwrite", (store) => store.put(record)); }
function requestPromise<T>(request: IDBRequest<T>) { return new Promise<T>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
function transactionPromise(database: IDBDatabase, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest) { return new Promise<void>((resolve, reject) => { const transaction = database.transaction(storeName, mode); action(transaction.objectStore(storeName)); transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); }); }
