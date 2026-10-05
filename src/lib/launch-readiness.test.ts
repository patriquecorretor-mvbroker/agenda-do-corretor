import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("launch readiness", () => {
  it("ships a complete installable PWA manifest", () => {
    const manifest = JSON.parse(readFileSync(resolve(root, "public/manifest.webmanifest"), "utf8"));

    expect(manifest.name).toBe("Agenda do Corretor");
    expect(manifest.id).toBe("/");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.lang).toBe("pt-BR");
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192", purpose: expect.stringContaining("maskable") }),
      expect.objectContaining({ sizes: "512x512", purpose: expect.stringContaining("maskable") })
    ]));

    for (const icon of manifest.icons) expect(existsSync(resolve(root, "public", icon.src.replace(/^\//, "")))).toBe(true);
  });

  it("protects every public table with RLS and at least one policy", () => {
    const sql = readdirSync(resolve(root, "supabase/migrations"))
      .filter((file) => file.endsWith(".sql"))
      .sort()
      .map((file) => readFileSync(resolve(root, "supabase/migrations", file), "utf8"))
      .join("\n");
    const tables = [...sql.matchAll(/create table(?: if not exists)? public\.([a-z0-9_]+)/gi)].map((match) => match[1]);

    expect(tables.length).toBeGreaterThan(0);
    for (const table of new Set(tables)) {
      expect(sql).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, "i"));
      expect(sql).toMatch(new RegExp(`create policy [\\s\\S]*? on public\\.${table}\\b`, "i"));
    }
  });

  it("does not expose privileged trigger functions to clients", () => {
    const hardening = readFileSync(resolve(root, "supabase/migrations/20261005010000_secure_privileged_functions.sql"), "utf8");
    expect(hardening).toContain("revoke all on function public.create_trial_subscription_for_user() from public, anon, authenticated");
    expect(hardening).toContain("revoke all on function public.capture_signup_legal_consent() from public, anon, authenticated");
    expect(hardening).toContain("grant execute on function public.is_super_admin() to authenticated");
  });
});
