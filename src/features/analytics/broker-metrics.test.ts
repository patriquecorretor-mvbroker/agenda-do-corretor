import { describe, expect, it } from "vitest";
import { buildCommercialMetrics, deduplicateClients } from "./broker-metrics";
import type { CalendarEvent, Client, Commission } from "@/types/database";

const baseClient = { user_id: "u", phone: null, whatsapp: null, email: null, city: "Capão da Canoa", neighborhood: null, property_profile: "Apartamento", budget_min: null, budget_max: null, payment_condition: null, bedrooms: null, notes: null, source: null, temperature: null, status: "lead", sale_date: null, next_follow_up: null, lat: null, lng: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z" } satisfies Omit<Client, "id" | "name">;

describe("broker metrics", () => {
  it("deduplica contatos pelo WhatsApp e mantém o mais recente", () => {
    const clients = [
      { ...baseClient, id: "1", name: "Ana", whatsapp: "(51) 99999-0000" },
      { ...baseClient, id: "2", name: "Ana Maria", whatsapp: "51 99999 0000", updated_at: "2026-10-02T10:00:00Z" }
    ] as Client[];
    expect(deduplicateClients(clients).map((client) => client.id)).toEqual(["2"]);
  });

  it("não mistura comissão potencial com venda confirmada", () => {
    const clients = [{ ...baseClient, id: "1", name: "Ana" }] as Client[];
    const commissions = [
      { id: "a", status: "em negociação" },
      { id: "b", status: "confirmada" }
    ] as Commission[];
    const metrics = buildCommercialMetrics({ clients, events: [] as CalendarEvent[], commissions });
    expect(metrics.convertedSales).toBe(1);
    expect(metrics.clientPortfolio).toBe(1);
  });
});
