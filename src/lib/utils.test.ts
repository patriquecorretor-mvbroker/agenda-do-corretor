import { describe, expect, it } from "vitest";
import { formatCurrency } from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats BRL with cents", () => {
    expect(formatCurrency(1250)).toBe("R$ 1.250,00");
    expect(formatCurrency(12.34)).toBe("R$ 12,34");
  });
});
