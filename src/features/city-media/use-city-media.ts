import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-context";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import type { CityMedia } from "@/types/database";

const bucket = "city-media";
const databaseName = "agenda-corretor-media";
const storeName = "media";
const favoriteKey = "agenda-city-media-demo-favorite";

export type CityMediaInput = Pick<CityMedia, "title" | "city" | "neighborhood" | "category" | "orientation" | "tags" | "captured_at"> & { file: File };

const demoMedia: CityMedia = {
  id: "demo-city-capao-sunset",
  user_id: "demo-user",
  title: "Orla ao pôr do sol",
  city: "Capão da Canoa",
  neighborhood: "Centro",
  media_type: "photo",
  category: "praia",
  orientation: "horizontal",
  storage_path: null,
  mime_type: "image/png",
  file_size: 2408253,
  tags: ["orla", "pôr do sol", "litoral"],
  favorite: false,
  captured_at: null,
  created_at: "2026-09-28T08:00:00-03:00",
  updated_at: "2026-09-28T08:00:00-03:00",
  media_url: "/brand/capao-sunset.png",
  demo: true
};

export function useCityMedia() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["city-media", user?.id] as const;
  const query = useQuery({ queryKey, enabled: Boolean(user), queryFn: () => hasSupabaseConfig ? remoteList(user!.id) : localList(), staleTime: 2 * 60 * 1000 });
  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const upload = useMutation({
    mutationFn: (input: CityMediaInput) => hasSupabaseConfig ? remoteUpload(user!.id, input) : localUpload(user!.id, input),
    onSuccess: refresh
  });
  const favorite = useMutation({
    mutationFn: ({ media, value }: { media: CityMedia; value: boolean }) => hasSupabaseConfig ? remoteFavorite(user!.id, media.id, value) : localFavorite(media, value),
    onSuccess: refresh
  });
  const remove = useMutation({
    mutationFn: (media: CityMedia) => hasSupabaseConfig ? remoteRemove(user!.id, media) : localRemove(media),
    onSuccess: refresh
  });

  return { media: query.data ?? [], isLoading: query.isLoading, error: query.error, upload, favorite, remove };
}

async function remoteList(userId: string): Promise<CityMedia[]> {
  const client = requireSupabase() as any;
  const { data, error } = await client.from("city_media").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map(async (item: CityMedia) => {
    if (!item.storage_path) return item;
    const { data: signed } = await client.storage.from(bucket).createSignedUrl(item.storage_path, 3600);
    return { ...item, media_url: signed?.signedUrl };
  }));
}

async function remoteUpload(userId: string, input: CityMediaInput): Promise<CityMedia> {
  const client = requireSupabase() as any;
  const id = crypto.randomUUID();
  const path = `${userId}/${id}-${safeName(input.file.name)}`;
  const { error: storageError } = await client.storage.from(bucket).upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (storageError) throw storageError;
  const row = toRow(userId, id, path, input);
  const { data, error } = await client.from("city_media").insert(row).select("*").single();
  if (error) { await client.storage.from(bucket).remove([path]); throw error; }
  return data;
}

async function remoteFavorite(userId: string, id: string, value: boolean) {
  const client = requireSupabase() as any;
  const { error } = await client.from("city_media").update({ favorite: value }).eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

async function remoteRemove(userId: string, media: CityMedia) {
  const client = requireSupabase() as any;
  if (media.storage_path) {
    const { error: storageError } = await client.storage.from(bucket).remove([media.storage_path]);
    if (storageError) throw storageError;
  }
  const { error } = await client.from("city_media").delete().eq("id", media.id).eq("user_id", userId);
  if (error) throw error;
}

async function localList(): Promise<CityMedia[]> {
  const records = await allLocal();
  const favorite = localStorage.getItem(favoriteKey) === "true";
  return [{ ...demoMedia, favorite }, ...records.map((record) => ({ ...record.media, media_url: URL.createObjectURL(record.blob) }))];
}

async function localUpload(userId: string, input: CityMediaInput): Promise<CityMedia> {
  const id = crypto.randomUUID();
  const media = toRow(userId, id, id, input);
  const database = await openDatabase();
  await transactionPromise(database, "readwrite", (store) => store.put({ id, media, blob: input.file }));
  return media;
}

async function localFavorite(media: CityMedia, value: boolean) {
  if (media.demo) { localStorage.setItem(favoriteKey, String(value)); return; }
  const database = await openDatabase();
  const record = await requestPromise<LocalRecord | undefined>(database.transaction(storeName).objectStore(storeName).get(media.id));
  if (!record) return;
  record.media.favorite = value;
  record.media.updated_at = new Date().toISOString();
  await transactionPromise(database, "readwrite", (store) => store.put(record));
}

async function localRemove(media: CityMedia) {
  if (media.demo) return;
  const database = await openDatabase();
  await transactionPromise(database, "readwrite", (store) => store.delete(media.id));
}

function toRow(userId: string, id: string, path: string, input: CityMediaInput): CityMedia {
  const now = new Date().toISOString();
  return { id, user_id: userId, title: input.title, city: input.city, neighborhood: input.neighborhood, media_type: input.file.type.startsWith("video/") ? "video" : "photo", category: input.category, orientation: input.orientation, storage_path: path, mime_type: input.file.type, file_size: input.file.size, tags: input.tags, favorite: false, captured_at: input.captured_at, created_at: now, updated_at: now };
}

type LocalRecord = { id: string; media: CityMedia; blob: Blob };
function openDatabase() { return new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open(databaseName, 1); request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName, { keyPath: "id" }); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function allLocal() { const database = await openDatabase(); return requestPromise<LocalRecord[]>(database.transaction(storeName).objectStore(storeName).getAll()); }
function requestPromise<T>(request: IDBRequest<T>) { return new Promise<T>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
function transactionPromise(database: IDBDatabase, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest) { return new Promise<void>((resolve, reject) => { const transaction = database.transaction(storeName, mode); action(transaction.objectStore(storeName)); transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); }); }
function safeName(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "").slice(0, 90); }
