import { useQuery } from "@tanstack/react-query";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import type { Building } from "@/types/database";

type BuildingRow = {
  id: string;
  name: string;
  street: string;
  street_number: string | null;
  neighborhood: string;
  postal_code: string | null;
  latitude: number;
  longitude: number;
  source_row: number;
};

async function loadLocalCatalog() {
  const module = await import("./buildings-data.json");
  return module.default as Building[];
}

async function listBuildings(): Promise<Building[]> {
  const { data, error } = await (requireSupabase() as any)
    .from("buildings")
    .select("id,name,street,street_number,neighborhood,postal_code,latitude,longitude,source_row")
    .order("name");
  if (error) throw error;
  return (data as BuildingRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    street: row.street,
    number: row.street_number,
    neighborhood: row.neighborhood,
    postalCode: row.postal_code,
    latitude: row.latitude,
    longitude: row.longitude,
    mapsUrl: `https://www.google.com/maps?q=${row.latitude},${row.longitude}`,
    sourceRow: row.source_row
  }));
}

export function useBuildings() {
  const query = useQuery({
    queryKey: ["buildings", "catalog-v1"],
    queryFn: async () => {
      if (hasSupabaseConfig) {
        try {
          return await listBuildings();
        } catch {
          return loadLocalCatalog();
        }
      }
      return loadLocalCatalog();
    },
    staleTime: Infinity
  });
  return { buildings: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function buildingAddress(building: Building) {
  return `${building.street}${building.number ? `, ${building.number}` : ""} · ${building.neighborhood}`;
}
