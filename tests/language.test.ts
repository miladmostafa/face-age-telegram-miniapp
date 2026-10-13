import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MESSAGE_KEYS, translate } from "../src/shared/messages";

describe("English copy", () => {
  it("returns an English string for every shell message", () => {
    for (const key of MESSAGE_KEYS) {
      const text = translate(key);
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toMatch(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/);
      expect(text).not.toMatch(/[\u0400-\u04FF]/);
    }
    expect(translate("title")).toBe("Check your skin");
    expect(translate("lede")).toContain("Scan your skin");
    expect(translate("botSkinAge", { value: 36 })).toBe("Skin age: 36");
    expect(translate("botSkinDamage", { value: 12 })).toBe("Skin damage: 12%");
  });
});

describe("English widget", () => {
  it("mounts Face Age in English and does not switch page direction", () => {
    const scanner = readFileSync("src/scanner.ts", "utf8");
    const main = readFileSync("src/main.ts", "utf8");
    const html = readFileSync("index.html", "utf8");
    expect(scanner).toContain('language: "en"');
    expect(scanner).not.toContain("options.language");
    expect(main).not.toContain("isRtlLanguage");
    expect(main).not.toContain("documentElement.dir");
    expect(html).toContain('lang="en"');
    expect(html).not.toContain("Noto Sans Arabic");
  });
});
