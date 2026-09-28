import { useQuery, useQueryClient } from "@tanstack/react-query";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import type { Building } from "@/types/database";
import { enrichBuilding } from "./building-enrichment";

const localStorageKey = "agenda-corretor-building-records-v2";
const queryKey = ["buildings", "catalog-v2"] as const;

type BuildingRow = {
  id: string;
  user_id?: string | null;
  name: string;
  street: string;
  street_number: string | null;
  neighborhood: string;
  city?: string | null;
  state?: string | null;
  postal_code: string | null;
  latitude: number;
  longitude: number;
  source_row: number | null;
  cover_url?: string | null;
  cover_source_url?: string | null;
  cover_source_title?: string | null;
  builder?: string | null;
  developer?: string | null;
  construction_year?: number | null;
  delivery_year?: number | null;
  towers?: number | null;
  floors?: number | null;
  total_units?: number | null;
  units_per_floor?: number | null;
  elevators?: number | null;
  parking_spaces?: number | null;
  bedrooms_min?: number | null;
  bedrooms_max?: number | null;
  private_area_min?: number | null;
  private_area_max?: number | null;
  amenities?: string[] | null;
  description?: string | null;
  website_url?: string | null;
  source_url?: string | null;
  source_title?: string | null;
  source_checked_at?: string | null;
  verification_status?: Building["verificationStatus"] | null;
  notes?: string | null;
};

async function loadLocalCatalog() {
  const module = await import("./buildings-data.json");
  return mergeLocalRecords((module.default as Building[]).map(enrichBuilding));
}

function rowToBuilding(row: BuildingRow, applyVerified = true): Building {
  const building = {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    street: row.street,
    number: row.street_number,
    neighborhood: row.neighborhood,
    city: row.city ?? "Capão da Canoa",
    state: row.state ?? "RS",
    postalCode: row.postal_code,
    latitude: row.latitude,
    longitude: row.longitude,
    mapsUrl: `https://www.google.com/maps?q=${row.latitude},${row.longitude}`,
    sourceRow: row.source_row ?? 0,
    coverUrl: row.cover_url,
    coverSourceUrl: row.cover_source_url,
    coverSourceTitle: row.cover_source_title,
    builder: row.builder,
    developer: row.developer,
    constructionYear: row.construction_year,
    deliveryYear: row.delivery_year,
    towers: row.towers,
    floors: row.floors,
    totalUnits: row.total_units,
    unitsPerFloor: row.units_per_floor,
    elevators: row.elevators,
    parkingSpaces: row.parking_spaces,
    bedroomsMin: row.bedrooms_min,
    bedroomsMax: row.bedrooms_max,
    privateAreaMin: row.private_area_min,
    privateAreaMax: row.private_area_max,
    amenities: row.amenities ?? [],
    description: row.description,
    websiteUrl: row.website_url,
    sourceUrl: row.source_url,
    sourceTitle: row.source_title,
    sourceCheckedAt: row.source_checked_at,
    verificationStatus: row.verification_status ?? "pendente",
    notes: row.notes
  } as Building;
  return applyVerified ? enrichBuilding(building) : building;
}

const buildingColumns = "id,user_id,name,street,street_number,neighborhood,city,state,postal_code,latitude,longitude,source_row,cover_url,cover_source_url,cover_source_title,builder,developer,construction_year,delivery_year,towers,floors,total_units,units_per_floor,elevators,parking_spaces,bedrooms_min,bedrooms_max,private_area_min,private_area_max,amenities,description,website_url,source_url,source_title,source_checked_at,verification_status,notes";

async function listBuildings(): Promise<Building[]> {
  const client = requireSupabase() as any;
  const { data, error } = await client.from("buildings").select(buildingColumns).order("name");
  if (error) throw error;
  let result = (data as BuildingRow[]).map((row) => rowToBuilding(row));
  const { data: user } = await client.auth.getUser();
  if (user?.user) {
    const overrideColumns = buildingColumns.replace("id,user_id,", "building_id,user_id,");
    const { data: overrides } = await client.from("building_overrides").select(overrideColumns);
    const byId = new Map<string, BuildingRow & { building_id: string }>((overrides ?? []).map((row: BuildingRow & { building_id: string }) => [row.building_id, row]));
    result = result.map((building) => {
      const override = byId.get(building.id);
      return override ? { ...building, ...rowToBuilding({ ...override, id: building.id, source_row: building.sourceRow }, false) } : building;
    });
  }
  return mergeLocalRecords(result);
}

export function useBuildings() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (hasSupabaseConfig) {
        try { return await listBuildings(); } catch { return loadLocalCatalog(); }
      }
      return loadLocalCatalog();
    },
    staleTime: Infinity
  });

  async function saveBuilding(building: Building) {
    const saved = { ...building, mapsUrl: `https://www.google.com/maps?q=${building.latitude},${building.longitude}` };
    saveLocalRecord(saved);
    if (hasSupabaseConfig) {
      const client = requireSupabase() as any;
      const { data: auth } = await client.auth.getUser();
      const userId = auth?.user?.id;
      if (userId) {
        const payload = buildingToRow(saved, userId);
        if (saved.sourceRow > 0 && !saved.userId) {
          const { id: _id, ...override } = payload;
          await client.from("building_overrides").upsert({ ...override, building_id: saved.id }, { onConflict: "user_id,building_id" });
        } else {
          await client.from("buildings").upsert(payload);
        }
      }
    }
    await queryClient.invalidateQueries({ queryKey });
  }

  return { buildings: query.data ?? [], isLoading: query.isLoading, error: query.error, saveBuilding };
}

function buildingToRow(building: Building, userId: string) {
  return {
    id: building.id,
    user_id: userId,
    name: building.name,
    street: building.street,
    street_number: building.number,
    neighborhood: building.neighborhood,
    city: building.city ?? "Capão da Canoa",
    state: building.state ?? "RS",
    postal_code: building.postalCode,
    latitude: building.latitude,
    longitude: building.longitude,
    source_row: building.sourceRow,
    cover_url: building.coverUrl,
    cover_source_url: building.coverSourceUrl,
    cover_source_title: building.coverSourceTitle,
    builder: building.builder,
    developer: building.developer,
    construction_year: building.constructionYear,
    delivery_year: building.deliveryYear,
    towers: building.towers,
    floors: building.floors,
    total_units: building.totalUnits,
    units_per_floor: building.unitsPerFloor,
    elevators: building.elevators,
    parking_spaces: building.parkingSpaces,
    bedrooms_min: building.bedroomsMin,
    bedrooms_max: building.bedroomsMax,
    private_area_min: building.privateAreaMin,
    private_area_max: building.privateAreaMax,
    amenities: building.amenities ?? [],
    description: building.description,
    website_url: building.websiteUrl,
    source_url: building.sourceUrl,
    source_title: building.sourceTitle,
    source_checked_at: building.sourceCheckedAt,
    verification_status: building.verificationStatus ?? "manual",
    notes: building.notes
  };
}

function readLocalRecords(): Building[] {
  try { return JSON.parse(localStorage.getItem(localStorageKey) ?? "[]") as Building[]; } catch { return []; }
}

function saveLocalRecord(building: Building) {
  const records = readLocalRecords().filter((record) => record.id !== building.id);
  localStorage.setItem(localStorageKey, JSON.stringify([building, ...records]));
}

function mergeLocalRecords(buildings: Building[]) {
  const local = readLocalRecords();
  const localById = new Map(local.map((building) => [building.id, building]));
  const merged = buildings.map((building) => localById.has(building.id) ? { ...building, ...localById.get(building.id) } : building);
  const known = new Set(buildings.map((building) => building.id));
  return [...local.filter((building) => !known.has(building.id)), ...merged].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function newBuilding(): Building {
  return {
    id: crypto.randomUUID(), userId: "local", name: "", street: "", number: null, neighborhood: "",
    city: "Capão da Canoa", state: "RS", postalCode: null, latitude: -29.761, longitude: -50.02,
    mapsUrl: "", sourceRow: 0, amenities: [], verificationStatus: "manual"
  };
}

export function buildingAddress(building: Building) {
  return `${building.street}${building.number ? `, ${building.number}` : ""} · ${building.neighborhood}`;
}
