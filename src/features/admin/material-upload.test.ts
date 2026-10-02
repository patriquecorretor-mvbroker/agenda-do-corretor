import { describe, expect, it } from "vitest";
import { sanitizeMaterialFileName, validateMaterialFile } from "./material-upload";

describe("material upload", () => {
  it("recognizes supported material types", () => {
    expect(validateMaterialFile({ name: "capa.jpg", size: 1000, type: "image/jpeg" })).toBe("image");
    expect(validateMaterialFile({ name: "guia.pdf", size: 1000, type: "application/pdf" })).toBe("pdf");
  });

  it("rejects unsupported and oversized files", () => {
    expect(() => validateMaterialFile({ name: "arquivo.exe", size: 10, type: "application/octet-stream" })).toThrow("Formato não aceito");
    expect(() => validateMaterialFile({ name: "video.mp4", size: 201_000_000, type: "video/mp4" })).toThrow("200 MB");
  });

  it("creates storage-safe file names", () => {
    expect(sanitizeMaterialFileName("Apresentação Atlântida 2026.PDF")).toBe("apresentacao-atlantida-2026.pdf");
  });
});
