import { describe, expect, it } from "vitest";
import { collectLocalAccountData } from "./account-data";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("account data export", () => {
  it("exports application data without unrelated browser storage", () => {
    const storage = new MemoryStorage();
    storage.setItem("agenda-demo-tasks", JSON.stringify([{ id: "1" }]));
    storage.setItem("mv-broker-clients", JSON.stringify([{ id: "2" }]));
    storage.setItem("unrelated-service", "secret");
    expect(collectLocalAccountData(storage)).toEqual({ "agenda-demo-tasks": [{ id: "1" }], "mv-broker-clients": [{ id: "2" }] });
  });
});
