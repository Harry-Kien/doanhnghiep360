import { describe, expect, it } from "vitest";
import { validateProductionProviderSelection } from "./settings";

describe("settings production safety", () => {
  it("rejects mock AI/OCR providers in production", () => {
    expect(() => validateProductionProviderSelection({ aiProvider: "mock" }, true)).toThrow(/AI/i);
    expect(() => validateProductionProviderSelection({ ocrProvider: "mock" }, true)).toThrow(/OCR/i);
    expect(() => validateProductionProviderSelection({ aiProvider: "gemini", ocrProvider: "local" }, true)).not.toThrow();
  });

  it("allows mock providers outside production", () => {
    expect(() => validateProductionProviderSelection({ aiProvider: "mock", ocrProvider: "mock" }, false)).not.toThrow();
  });
});
