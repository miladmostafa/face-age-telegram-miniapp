import { describe, expect, it } from "vitest";
import { FACE_AGE_LANGUAGES, isRtlLanguage, mapTelegramLanguage, resolveLanguage } from "../src/shared/language";

describe("mapTelegramLanguage", () => {
  it("accepts every face-age language code", () => {
    for (const code of FACE_AGE_LANGUAGES) {
      expect(mapTelegramLanguage(code)).toBe(code);
    }
    expect(FACE_AGE_LANGUAGES).toHaveLength(40);
  });

  it("maps regional and legacy Telegram codes", () => {
    expect(mapTelegramLanguage("fa-IR")).toBe("fa");
    expect(mapTelegramLanguage("pt-BR")).toBe("pt");
    expect(mapTelegramLanguage("zh-hans")).toBe("zh");
    expect(mapTelegramLanguage("en_US")).toBe("en");
    expect(mapTelegramLanguage("nb")).toBe("no");
    expect(mapTelegramLanguage("nn-NO")).toBe("no");
    expect(mapTelegramLanguage("fil")).toBe("tl");
    expect(mapTelegramLanguage("in")).toBe("id");
    expect(mapTelegramLanguage("iw")).toBe("he");
    expect(mapTelegramLanguage("ua")).toBe("uk");
  });

  it("falls back to English", () => {
    expect(mapTelegramLanguage(null)).toBe("en");
    expect(mapTelegramLanguage("")).toBe("en");
    expect(mapTelegramLanguage("xx")).toBe("en");
  });
});

describe("RTL and resolution", () => {
  it("flags Persian, Arabic, and Urdu", () => {
    expect(isRtlLanguage("fa")).toBe(true);
    expect(isRtlLanguage("ar")).toBe(true);
    expect(isRtlLanguage("ur")).toBe(true);
    expect(isRtlLanguage("en")).toBe(false);
    expect(isRtlLanguage("he")).toBe(false);
    expect(isRtlLanguage("ru")).toBe(false);
  });

  it("prefers the Telegram language inside a Mini App", () => {
    expect(
      resolveLanguage({
        telegramCode: "fa",
        queryCode: "en",
        navigatorCode: "ru",
        insideTelegram: true,
      }),
    ).toBe("fa");
  });

  it("uses the query language only outside Telegram", () => {
    expect(
      resolveLanguage({
        telegramCode: "fa",
        queryCode: "ar",
        navigatorCode: "ru",
        insideTelegram: false,
      }),
    ).toBe("ar");
  });
});
