import { describe, expect, it } from "vitest";
import { assertCatalog, loadSampleCatalog, resolveCatalog } from "../src/shared/products";
import { readClientId } from "../src/config";
import { prefersUploadFallback } from "../src/telegram";
import { sanitizeAnalysis } from "../src/shared/analysis";
import { themeVars } from "../src/shared/theme";

describe("sample catalog", () => {
  it("is a valid beauty-shop shelf with absolute image URLs", () => {
    const catalog = loadSampleCatalog();
    assertCatalog(catalog);
    expect(catalog.products.length).toBeGreaterThanOrEqual(5);
    const resolved = resolveCatalog(catalog, "https://shop.example");
    expect(resolved.products[0]?.image).toBe("https://shop.example/products/cloud-serum.svg");
    expect(resolved.products.every((product) => product.url.startsWith("https://"))).toBe(true);
  });
});

describe("client id", () => {
  it("stays empty until the environment provides one", () => {
    expect(readClientId(undefined)).toBeNull();
    expect(readClientId("  ")).toBeNull();
    expect(readClientId("abc")).toBe("abc");
  });
});

describe("camera fallback platforms", () => {
  it("flags mobile Telegram webviews", () => {
    expect(prefersUploadFallback("ios")).toBe(true);
    expect(prefersUploadFallback("android")).toBe(true);
    expect(prefersUploadFallback("tdesktop")).toBe(false);
    expect(prefersUploadFallback(undefined)).toBe(false);
  });
});

describe("analysis sanitizer", () => {
  it("keeps scores and drops images", () => {
    const summary = sanitizeAnalysis([
      { key: "acne", title: "Acne", score: 14, image: "data:image/png;base64,aaaa" },
      { key: "<script>", title: "nope", score: 1 },
    ]);
    expect(summary?.problems).toEqual([{ key: "acne", title: "Acne", score: 14 }]);
    expect(JSON.stringify(summary)).not.toContain("base64");
  });

  it("reads an object shaped like the advisor analysis", () => {
    const summary = sanitizeAnalysis({
      skinAge: 33,
      damagePercentage: 21.26,
      problems: [{ key: "pores", title: "Pores", percent: 8 }],
    });
    expect(summary).toMatchObject({ skinAge: 33, damagePercentage: 21.3 });
    expect(summary?.problems[0]?.score).toBe(8);
  });
});

describe("theme", () => {
  it("uses Telegram colors and ignores junk", () => {
    const vars = themeVars(
      { bg_color: "#112233", text_color: "javascript:alert(1)", button_color: "#abcdef" },
      "dark",
    );
    expect(vars.bg).toBe("#112233");
    expect(vars.accent).toBe("#abcdef");
    expect(vars.text).not.toContain("javascript");
    expect(vars.scheme).toBe("dark");
  });
});
