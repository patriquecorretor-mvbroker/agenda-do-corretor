import { useQuery, useQueryClient } from "@tanstack/react-query";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import type { Condominium } from "@/types/database";
import { condominiumCatalog } from "./condominiums-data";

const queryKey = ["condominiums", "catalog-v1"] as const;
const localStorageKey = "agenda-corretor-condominiums-v1";

type CondominiumRow = {
  id: string;
  user_id: string;
  name: string;
  city: string;
  neighborhood: string | null;
  status: Condominium["status"];
  developer: string | null;
  launch_year: number | null;
  total_units: number | null;
  area_ha: number | null;
  unit_type: Condominium["unitType"];
  area_min: number | null;
  area_max: number | null;
  has_beach_club: boolean;
  amenities: string[] | null;
  description: string | null;
  cover_url: string | null;
  source_url: string | null;
  source_title: string | null;
  source_checked_at: string | null;
  verification_status: Condominium["verificationStatus"];
  notes: string | null;
};

export function useCondominiums() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn: async () => mergeRecords(condominiumCatalog, await loadRemoteRecords()),
    staleTime: Infinity
  });

  async function saveCondominium(condominium: Condominium) {
    saveLocalRecord(condominium);
    if (hasSupabaseConfig) {
      const client = requireSupabase() as any;
      const { data } = await client.auth.getUser();
      if (data.user) {
        const payload = condominiumToRow(condominium, data.user.id);
        const { error } = await client.from("condominiums").upsert(payload);
        if (error) throw error;
      }
    }
    await queryClient.invalidateQueries({ queryKey });
  }

  return { condominiums: query.data ?? condominiumCatalog, isLoading: query.isLoading, error: query.error, saveCondominium };
}

async function loadRemoteRecords(): Promise<Condominium[]> {
  const local = readLocalRecords();
  if (!hasSupabaseConfig) return local;
  try {
    const client = requireSupabase() as any;
    const { data, error } = await client.from("condominiums").select("*").order("name");
    if (error) throw error;
    return mergeRecords((data as CondominiumRow[]).map(rowToCondominium), local);
  } catch {
    return local;
  }
}

function rowToCondominium(row: CondominiumRow): Condominium {
  return {
    id: row.id, userId: row.user_id, name: row.name, city: row.city, neighborhood: row.neighborhood,
    status: row.status, developer: row.developer, launchYear: row.launch_year, totalUnits: row.total_units,
    areaHa: row.area_ha, unitType: row.unit_type, areaMin: row.area_min, areaMax: row.area_max,
    hasBeachClub: row.has_beach_club, amenities: row.amenities ?? [], description: row.description,
    coverUrl: row.cover_url, sourceUrl: row.source_url, sourceTitle: row.source_title,
    sourceCheckedAt: row.source_checked_at, verificationStatus: row.verification_status, notes: row.notes
  };
}

function condominiumToRow(item: Condominium, userId: string) {
  return {
    id: item.id, user_id: userId, name: item.name, city: item.city, neighborhood: item.neighborhood,
    status: item.status, developer: item.developer, launch_year: item.launchYear, total_units: item.totalUnits,
    area_ha: item.areaHa, unit_type: item.unitType, area_min: item.areaMin, area_max: item.areaMax,
    has_beach_club: item.hasBeachClub, amenities: item.amenities, description: item.description,
    cover_url: item.coverUrl, source_url: item.sourceUrl, source_title: item.sourceTitle,
    source_checked_at: item.sourceCheckedAt, verification_status: item.verificationStatus, notes: item.notes
  };
}

function readLocalRecords(): Condominium[] {
  try { return JSON.parse(localStorage.getItem(localStorageKey) ?? "[]") as Condominium[]; } catch { return []; }
}

function saveLocalRecord(item: Condominium) {
  const records = readLocalRecords().filter((record) => record.id !== item.id);
  localStorage.setItem(localStorageKey, JSON.stringify([item, ...records]));
}

function mergeRecords(base: Condominium[], additions: Condominium[]) {
  const overrides = new Map(additions.map((item) => [item.id, item]));
  const known = new Set(base.map((item) => item.id));
  return [
    ...additions.filter((item) => !known.has(item.id)),
    ...base.map((item) => overrides.has(item.id) ? { ...item, ...overrides.get(item.id) } : item)
  ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function newCondominium(): Condominium {
  return {
    id: crypto.randomUUID(), userId: "local", name: "", city: "Capão da Canoa", neighborhood: null,
    status: "a confirmar", developer: null, launchYear: null, totalUnits: null, areaHa: null,
    unitType: "não informado", areaMin: null, areaMax: null, hasBeachClub: false, amenities: [],
    description: null, coverUrl: null, sourceUrl: null, sourceTitle: null, sourceCheckedAt: null,
    verificationStatus: "manual", notes: null
  };
}

export function condominiumMapsUrl(item: Condominium) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.name}, ${item.neighborhood ?? ""}, ${item.city}, RS`)}`;
}
