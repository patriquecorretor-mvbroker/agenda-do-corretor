import { describe, expect, it } from "vitest";
import { subscribersCsv } from "./admin-export";

describe("subscribersCsv", () => {
  it("exports Brazilian spreadsheet columns and neutralizes formulas", () => {
    const csv = subscribersCsv([{
      id: "subscription-1", user_id: "user-1", name: "=DANGEROUS", email: "broker@example.com", city: "Capão da Canoa",
      plan_id: "plan-1", status: "active", renewal: "2026-11-08", created_at: "2026-10-08T12:00:00Z"
    }], [{ id: "plan-1", name: "Profissional", slug: "pro", description: "", monthly_price: 89.9, annual_price: 899, features: [], active: true }]);

    expect(csv).toContain("\"'=DANGEROUS\"");
    expect(csv).toContain("\"Profissional\"");
    expect(csv).toContain("Capão da Canoa");
  });
});
