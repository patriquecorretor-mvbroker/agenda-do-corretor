import { describe, expect, it } from "vitest";
import { canAccessView, hasSubscriptionAccess, type SubscriptionAccess } from "@/features/admin/subscription-access";

const essential: SubscriptionAccess = {
  status: "active",
  currentPeriodEnd: null,
  trialEndsAt: null,
  planId: "essential",
  planName: "Essencial",
  planSlug: "essencial",
  features: ["Agenda", "Clientes", "Foco", "Materiais", "Meus Arquivos"],
  isAdmin: false
};

describe("subscription access", () => {
  it("keeps essential modules and blocks professional modules", () => {
    expect(canAccessView("agenda", essential)).toBe(true);
    expect(canAccessView("clients", essential)).toBe(true);
    expect(canAccessView("finance", essential)).toBe(false);
    expect(canAccessView("buildings", essential)).toBe(false);
  });

  it("blocks overdue and expired trial accounts", () => {
    expect(hasSubscriptionAccess({ ...essential, status: "past_due" })).toBe(false);
    expect(hasSubscriptionAccess({ ...essential, status: "trialing", trialEndsAt: "2026-01-01T00:00:00Z" }, new Date("2026-10-02T12:00:00Z"))).toBe(false);
  });

  it("always grants administration to a super admin", () => {
    const admin = { ...essential, status: "canceled" as const, isAdmin: true };
    expect(hasSubscriptionAccess(admin)).toBe(true);
    expect(canAccessView("admin", admin)).toBe(true);
    expect(canAccessView("finance", admin)).toBe(true);
  });
});
