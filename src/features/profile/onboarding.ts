import type { Profile } from "@/types/database";

export function isOnboardingComplete(profile?: Profile | null) {
  return Boolean(profile?.nome?.trim() && profile?.empresa?.trim());
}
