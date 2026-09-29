import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-context";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import type { CondominiumAsset, CondominiumAssetType } from "@/types/database";

const bucket = "condominium-assets";
const databaseName = "agenda-corretor-condominium-assets";
const storeName = "assets";

type UploadInput = { condominiumId: string; type: Exclude<CondominiumAssetType, "drive">; file: File };
type DriveInput = { condominiumId: string; title: string; url: string };
type LocalRecord = { id: string; asset: CondominiumAsset; blob?: Blob };

export function useCondominiumAssets(condominiumId?: string) {
  const { user } = useAuth();
  const userId = user?.id ?? "local-user";
  const queryClient = useQueryClient();
  const queryKey = ["condominium-assets", userId, condominiumId] as const;
  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const query = useQuery({
    queryKey,
    enabled: Boolean(condominiumId),
    queryFn: () => listAssets(userId, condominiumId!),
    staleTime: 60_000
  });

  const upload = useMutation({
    mutationFn: async (input: UploadInput) => {
      validateFile(input.type, input.file);
      if (hasSupabaseConfig && user) {
        try { return await remoteUpload(userId, input); } catch { return localUpload(userId, input); }
      }
      return localUpload(userId, input);
    },
    onSuccess: refresh
  });

  const addDrive = useMutation({
    mutationFn: async (input: DriveInput) => {
      const url = normalizeDriveUrl(input.url);
      const normalized = { ...input, url };
      if (hasSupabaseConfig && user) {
        try { return await remoteAddDrive(userId, normalized); } catch { return localAddDrive(userId, normalized); }
      }
      return localAddDrive(userId, normalized);
    },
    onSuccess: refresh
  });

  const remove = useMutation({
    mutationFn: async (asset: CondominiumAsset) => {
      if (hasSupabaseConfig && user && !asset.local_only) await remoteRemove(userId, asset);
      else await localRemove(asset.id);
    },
    onSuccess: refresh
  });

  return { assets: query.data ?? [], isLoading: query.isLoading, error: query.error, upload, addDrive, remove };
}

async function listAssets(userId: string, condominiumId: string) {
  const local = await localList(condominiumId);
  if (!hasSupabaseConfig || userId === "local-user") return local;
  try {
    const remote = await remoteList(userId, condominiumId);
    return [...remote, ...local.filter((item) => !remote.some((saved) => saved.id === item.id))];
  } catch {
    return local;
  }
}

async function remoteList(userId: string, condominiumId: string): Promise<CondominiumAsset[]> {
  const client = requireSupabase() as any;
  const { data, error } = await client.from("condominium_assets").select("*").eq("user_id", userId).eq("condominium_id", condominiumId).order("created_at", { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map(async (asset: CondominiumAsset) => {
    if (!asset.storage_path) return asset;
    const { data: signed, error: signedError } = await client.storage.from(bucket).createSignedUrl(asset.storage_path, 3600);
    if (signedError) return asset;
    return { ...asset, asset_url: signed?.signedUrl };
  }));
}

async function remoteUpload(userId: string, input: UploadInput): Promise<CondominiumAsset> {
  const client = requireSupabase() as any;
  const id = crypto.randomUUID();
  const path = `${userId}/${safeName(input.condominiumId)}/${id}-${safeName(input.file.name)}`;
  const { error: storageError } = await client.storage.from(bucket).upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (storageError) throw storageError;
  const row = fileAsset(userId, id, input, path);
  const { data, error } = await client.from("condominium_assets").insert(row).select("*").single();
  if (error) { await client.storage.from(bucket).remove([path]); throw error; }
  return data;
}

async function remoteAddDrive(userId: string, input: DriveInput): Promise<CondominiumAsset> {
  const client = requireSupabase() as any;
  const row = driveAsset(userId, crypto.randomUUID(), input);
  const { data, error } = await client.from("condominium_assets").insert(row).select("*").single();
  if (error) throw error;
  return data;
}

async function remoteRemove(userId: string, asset: CondominiumAsset) {
  const client = requireSupabase() as any;
  if (asset.storage_path) {
    const { error: storageError } = await client.storage.from(bucket).remove([asset.storage_path]);
    if (storageError) throw storageError;
  }
  const { error } = await client.from("condominium_assets").delete().eq("id", asset.id).eq("user_id", userId);
  if (error) throw error;
}

async function localList(condominiumId: string): Promise<CondominiumAsset[]> {
  const records = await allLocal();
  return records
    .filter((record) => record.asset.condominium_id === condominiumId)
    .sort((a, b) => b.asset.created_at.localeCompare(a.asset.created_at))
    .map((record) => ({ ...record.asset, asset_url: record.blob ? URL.createObjectURL(record.blob) : undefined, local_only: true }));
}

async function localUpload(userId: string, input: UploadInput) {
  const id = crypto.randomUUID();
  const asset = { ...fileAsset(userId, id, input, id), local_only: true };
  await putLocal({ id, asset, blob: input.file });
  return asset;
}

async function localAddDrive(userId: string, input: DriveInput) {
  const id = crypto.randomUUID();
  const asset = { ...driveAsset(userId, id, input), local_only: true };
  await putLocal({ id, asset });
  return asset;
}

async function localRemove(id: string) {
  const database = await openDatabase();
  await transactionPromise(database, "readwrite", (store) => store.delete(id));
}

function fileAsset(userId: string, id: string, input: UploadInput, path: string): CondominiumAsset {
  const now = new Date().toISOString();
  return { id, user_id: userId, condominium_id: input.condominiumId, asset_type: input.type, title: titleFromName(input.file.name), file_name: input.file.name, storage_path: path, external_url: null, mime_type: input.file.type || null, file_size: input.file.size, created_at: now, updated_at: now };
}

function driveAsset(userId: string, id: string, input: DriveInput): CondominiumAsset {
  const now = new Date().toISOString();
  return { id, user_id: userId, condominium_id: input.condominiumId, asset_type: "drive", title: input.title.trim() || "Pasta no Google Drive", file_name: null, storage_path: null, external_url: input.url, mime_type: null, file_size: null, created_at: now, updated_at: now };
}

function validateFile(type: UploadInput["type"], file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const correctType = type === "photo" ? file.type.startsWith("image/") : type === "video" ? file.type.startsWith("video/") : file.type === "application/pdf" || extension === "pdf";
  if (!correctType) throw new Error(type === "photo" ? "Selecione uma imagem." : type === "video" ? "Selecione um vídeo." : "Selecione um arquivo PDF.");
  const max = type === "video" ? 250 * 1024 * 1024 : type === "pdf" ? 30 * 1024 * 1024 : 20 * 1024 * 1024;
  if (file.size > max) throw new Error(`O arquivo excede o limite de ${formatBytes(max)}.`);
}

function normalizeDriveUrl(value: string) {
  const url = new URL(value.trim());
  if (url.protocol !== "https:" || !["drive.google.com", "docs.google.com"].includes(url.hostname)) throw new Error("Cole um link válido do Google Drive.");
  return url.toString();
}

function titleFromName(value: string) { return value.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Material do condomínio"; }
function safeName(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "").slice(0, 90); }
function formatBytes(value: number) { return value >= 1024 * 1024 ? `${Math.round(value / 1024 / 1024)} MB` : `${Math.round(value / 1024)} KB`; }
function openDatabase() { return new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open(databaseName, 1); request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName, { keyPath: "id" }); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function allLocal() { const database = await openDatabase(); return requestPromise<LocalRecord[]>(database.transaction(storeName).objectStore(storeName).getAll()); }
async function putLocal(record: LocalRecord) { const database = await openDatabase(); await transactionPromise(database, "readwrite", (store) => store.put(record)); }
function requestPromise<T>(request: IDBRequest<T>) { return new Promise<T>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
function transactionPromise(database: IDBDatabase, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest) { return new Promise<void>((resolve, reject) => { const transaction = database.transaction(storeName, mode); action(transaction.objectStore(storeName)); transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); }); }
