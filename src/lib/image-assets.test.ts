import { describe, expect, it } from "vitest";
import { validateImage } from "./image-assets";

function image(type: string, size: number) { return { type, size } as File; }

describe("validateImage", () => {
  it("accepts common photo formats within the limit", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) expect(() => validateImage(image(type, 5_000_000))).not.toThrow();
  });

  it("rejects unsupported formats and oversized files", () => {
    expect(() => validateImage(image("image/svg+xml", 100))).toThrow("JPG, PNG ou WebP");
    expect(() => validateImage(image("image/jpeg", 5_000_001))).toThrow("até 5 MB");
  });
});
