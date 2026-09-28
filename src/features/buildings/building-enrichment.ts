import type { Building } from "@/types/database";

export const verifiedBuildingEnrichment: Record<string, Partial<Building>> = {
  "4524831a-2ede-58a9-8d4f-e10a1a919f53": {
    city: "Capão da Canoa",
    state: "RS",
    postalCode: "95555-000",
    coverUrl: "/buildings/via-del-mare.jpg",
    coverSourceUrl: "https://www.omelhordapraia.com.br/imovel/664-apartamento-de-3-dormitorios-sacada-de-frente-predio-com-infraestrutura-apenas-3-quadras-da-praia",
    coverSourceTitle: "Fachada · O Melhor da Praia",
    builder: "Nazale Incorporadora e Construtora",
    developer: "Nazale Incorporadora e Construtora",
    elevators: 2,
    bedroomsMin: 1,
    bedroomsMax: 3,
    privateAreaMin: 43.45,
    privateAreaMax: 119.48,
    amenities: [
      "Academia",
      "Brinquedoteca",
      "Churrasqueira",
      "Piscina aquecida",
      "Playground",
      "Sala de cinema",
      "Sala de jogos",
      "Salão de festas",
      "Varanda"
    ],
    description: "Empreendimento residencial no bairro Navegantes, a três quadras do mar, com apartamentos de 1, 2 e 3 dormitórios e infraestrutura de lazer.",
    websiteUrl: "https://nazale.com.br/via-del-mare/",
    sourceUrl: "https://nazale.com.br/via-del-mare/",
    sourceTitle: "Via Del Mare · Nazale",
    sourceCheckedAt: "2026-09-28",
    verificationStatus: "verificado",
    notes: "Construtora, tipologias, áreas e lazer confirmados na página oficial. Dois elevadores confirmados em anúncio imobiliário local. Ano de construção e total de unidades ainda não foram confirmados."
  }
};

export function enrichBuilding(building: Building): Building {
  const defined = Object.fromEntries(Object.entries(building).filter(([, value]) => value !== undefined));
  return { city: "Capão da Canoa", state: "RS", verificationStatus: "pendente", amenities: [], ...defined, ...verifiedBuildingEnrichment[building.id] } as Building;
}
