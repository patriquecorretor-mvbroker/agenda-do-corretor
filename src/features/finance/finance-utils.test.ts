import { describe, expect, it } from "vitest";
import { buildEqualInstallments, installmentBalance } from "@/features/finance/finance-utils";
import { inferFinancialCategory } from "@/features/finance/finance-import";

describe("finance utilities", () => {
  it("splits a commission without losing cents", () => {
    const installments = buildEqualInstallments({ commissionId: "commission", userId: "user", total: 100, count: 3, firstDate: "2026-10-10" });
    expect(installments.map((item) => item.expected_amount)).toEqual([33.33, 33.33, 33.34]);
    expect(installments.map((item) => item.due_date)).toEqual(["2026-10-10", "2026-11-10", "2026-12-10"]);
  });

  it("keeps the billing day across different month lengths", () => {
    const installments = buildEqualInstallments({ commissionId: "commission", userId: "user", total: 300, count: 3, firstDate: "2026-10-31" });
    expect(installments.map((item) => item.due_date)).toEqual(["2026-10-31", "2026-11-30", "2026-12-31"]);
  });

  it("keeps partial receipts open until the balance reaches zero", () => {
    expect(installmentBalance({ expected_amount: 10000, received_amount: 6000 } as never)).toBe(4000);
  });

  it("classifies common broker expenses", () => {
    expect(inferFinancialCategory("POSTO IPIRANGA", "expense")).toBe("combustível");
    expect(inferFinancialCategory("MENSALIDADE MV BROKER", "expense")).toBe("MV Broker");
  });
});
