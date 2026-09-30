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
  },
  "c22a926e-f2cd-5503-855d-4263e5f616b9": {
    city: "Capão da Canoa",
    state: "RS",
    builder: "Nazale Incorporadora e Construtora",
    developer: "Nazale Incorporadora e Construtora",
    deliveryYear: 2013,
    elevators: 2,
    bedroomsMin: 1,
    bedroomsMax: 4,
    privateAreaMin: 75.84,
    privateAreaMax: 257.53,
    amenities: ["Academia", "Bicicletário", "Churrasqueira", "Espaço gourmet", "Gás central", "Piscina aquecida", "Salão de festas"],
    description: "Empreendimento residencial de frente para o mar, no bairro Navegantes, com apartamentos de 1, 2 e 4 dormitórios e infraestrutura de lazer.",
    websiteUrl: "https://nazale.com.br/residencial-deauville/",
    sourceUrl: "https://nazale.com.br/residencial-deauville/",
    sourceTitle: "Residencial Deauville · Nazale",
    sourceCheckedAt: "2026-09-30",
    verificationStatus: "web",
    notes: "Construtora, tipologias, áreas e lazer confirmados no site oficial. Entrega e dois elevadores constam em catálogo imobiliário público. O logradouro publicado diverge da base original e deve ser confirmado antes de substituir o endereço."
  },
  "672302dd-8347-56d2-b81f-71468445823b": {
    city: "Capão da Canoa",
    state: "RS",
    builder: "Marina Park Construtora",
    developer: "Marina Park Construtora",
    constructionYear: 2012,
    deliveryYear: 2012,
    elevators: 2,
    bedroomsMin: 2,
    bedroomsMax: 4,
    amenities: ["Academia", "Acessibilidade", "Churrasqueira", "Espaço gourmet", "Gás central", "Piscina", "Portaria eletrônica", "Sala de jogos", "Salão de festas", "Zeladoria"],
    description: "Edifício de alto padrão no bairro Navegantes, próximo ao mar, com apartamentos de 2 a 4 dormitórios e áreas de convivência.",
    sourceUrl: "https://www.ilitoral.com.br/condominio/ver/dubai-capao-da-canoa%2C220",
    sourceTitle: "Dubai · catálogo imobiliário público",
    sourceCheckedAt: "2026-09-30",
    verificationStatus: "web",
    notes: "Ficha preenchida a partir de catálogo imobiliário público. Confirmar matrícula, total de unidades e dados condominiais diretamente com a administradora ou construtora."
  },
  "ded5fd5a-a6f5-5c4c-9a00-15cfe980d78e": {
    city: "Capão da Canoa",
    state: "RS",
    elevators: 2,
    amenities: ["Água quente", "Churrasqueira", "Espaço gourmet", "Hall decorado"],
    description: "Edifício residencial no bairro Navegantes. Anúncios públicos registram hall decorado, dois elevadores e apartamentos com churrasqueira.",
    sourceUrl: "https://www.upimoveis.imb.br/imovel/1294569/edificio-pacific",
    sourceTitle: "Edifício Pacific · anúncio imobiliário público",
    sourceCheckedAt: "2026-09-30",
    verificationStatus: "web",
    notes: "A fonte consultada descreve uma unidade específica; metragem, dormitórios e vagas não foram generalizados para todo o edifício."
  }
};

export function enrichBuilding(building: Building): Building {
  const defined = Object.fromEntries(Object.entries(building).filter(([, value]) => value !== undefined));
  return { city: "Capão da Canoa", state: "RS", verificationStatus: "pendente", amenities: [], ...defined, ...verifiedBuildingEnrichment[building.id] } as Building;
}
