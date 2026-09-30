import type { CityMedia } from "@/types/database";

export type CityPageProfile = {
  name: string;
  state: string;
  tagline: string;
  description: string;
  coverUrl: string;
  driveUrl: string;
  tourUrl: string;
};

export type SharedCityMedia = Pick<CityMedia, "title" | "media_type" | "category" | "neighborhood" | "orientation"> & {
  url: string;
};

export type SharedCityPage = {
  version: 1;
  profile: CityPageProfile;
  media: SharedCityMedia[];
};

export const categoryLabels: Record<CityMedia["category"], string> = {
  praia: "Praias e orla",
  cidade: "Cidade",
  gastronomia: "Gastronomia",
  lifestyle: "Estilo de vida",
  infraestrutura: "Infraestrutura",
  evento: "Eventos",
  outro: "Outros"
};

const defaultProfiles: Record<string, CityPageProfile> = {
  "Capão da Canoa": {
    name: "Capão da Canoa",
    state: "Rio Grande do Sul",
    tagline: "Viva o litoral de um jeito especial.",
    description: "Conheça praias, bairros, gastronomia e o estilo de vida de Capão da Canoa em uma seleção preparada pelo seu corretor.",
    coverUrl: "/brand/capao-sunset.png",
    driveUrl: "",
    tourUrl: ""
  },
  "Xangri-Lá": {
    name: "Xangri-Lá",
    state: "Rio Grande do Sul",
    tagline: "Um novo olhar para viver junto ao mar.",
    description: "Explore praias, condomínios, gastronomia e experiências de Xangri-Lá em uma apresentação organizada para você.",
    coverUrl: "/brand/capao-sunset.png",
    driveUrl: "",
    tourUrl: ""
  }
};

export function cityProfile(city: string, media: CityMedia[] = []): CityPageProfile {
  const fallback = defaultProfiles[city] ?? {
    name: city,
    state: "Rio Grande do Sul",
    tagline: "Descubra cada detalhe desta cidade.",
    description: `Uma seleção de imagens e experiências de ${city}, organizada pelo seu corretor.`,
    coverUrl: media.find((item) => item.media_type === "photo" && item.media_url)?.media_url ?? "/brand/capao-sunset.png",
    driveUrl: "",
    tourUrl: ""
  };
  try {
    const saved = localStorage.getItem(`agenda-city-page:${city}`);
    return saved ? { ...fallback, ...JSON.parse(saved), name: city } : fallback;
  } catch {
    return fallback;
  }
}

export function saveCityProfile(profile: CityPageProfile) {
  localStorage.setItem(`agenda-city-page:${profile.name}`, JSON.stringify(profile));
}

export function makeSharedCityPage(profile: CityPageProfile, media: CityMedia[]): SharedCityPage {
  return {
    version: 1,
    profile,
    media: media.filter((item) => Boolean(item.media_url)).slice(0, 12).map((item) => ({
      title: item.title,
      media_type: item.media_type,
      category: item.category,
      neighborhood: item.neighborhood,
      orientation: item.orientation,
      url: item.media_url!
    }))
  };
}

export function sharedCityUrl(payload: SharedCityPage) {
  const url = new URL(window.location.origin);
  url.searchParams.set("cidade", encodePayload(payload));
  return url.toString();
}

export function readSharedCityPage(): SharedCityPage | null {
  const encoded = new URLSearchParams(window.location.search).get("cidade");
  if (!encoded) return null;
  try {
    const payload = decodePayload(encoded) as SharedCityPage;
    if (payload.version !== 1 || !payload.profile?.name || !Array.isArray(payload.media)) return null;
    return payload;
  } catch {
    return null;
  }
}

function encodePayload(value: SharedCityPage) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function decodePayload(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}
