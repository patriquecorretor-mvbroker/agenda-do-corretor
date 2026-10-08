import { describe, expect, it } from "vitest";
import type { Profile } from "@/types/database";
import { isOnboardingComplete } from "./onboarding";

const profile = { nome: "Patrique", empresa: "MV Broker" } as Profile;

describe("isOnboardingComplete", () => {
  it("requires only broker and company names", () => {
    expect(isOnboardingComplete(profile)).toBe(true);
    expect(isOnboardingComplete({ ...profile, empresa: "" })).toBe(false);
    expect(isOnboardingComplete({ ...profile, nome: "" })).toBe(false);
  });
});
