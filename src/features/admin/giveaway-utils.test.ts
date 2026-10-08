import { describe, expect, it } from "vitest";
import { secureRandomIndex, winnerRotation } from "./giveaway-utils";

describe("giveaway helpers", () => {
  it("maps random values to a valid participant", () => {
    expect(secureRandomIndex(5, (array) => { array[0] = 7; return array; })).toBe(2);
  });

  it("rejects an empty draw", () => {
    expect(() => secureRandomIndex(0)).toThrow("ao menos um participante");
  });

  it("stops the selected slice under the pointer after full rotations", () => {
    const rotation = winnerRotation(0, 2, 5);
    expect(rotation).toBeGreaterThanOrEqual(8 * 360);
    expect(rotation % 360).toBeCloseTo(180);
  });
});
