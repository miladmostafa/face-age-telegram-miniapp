/** Language codes accepted by the face-age SDK (40 languages). */
export const FACE_AGE_LANGUAGES = [
  "ar",
  "bg",
  "bn",
  "cs",
  "da",
  "de",
  "el",
  "en",
  "es",
  "et",
  "fa",
  "fi",
  "fr",
  "he",
  "hi",
  "hr",
  "hu",
  "id",
  "it",
  "ja",
  "ko",
  "lt",
  "lv",
  "ms",
  "nl",
  "no",
  "pl",
  "pt",
  "ro",
  "ru",
  "sk",
  "sr",
  "sv",
  "th",
  "tl",
  "tr",
  "uk",
  "ur",
  "vi",
  "zh",
] as const;

export type FaceAgeLanguage = (typeof FACE_AGE_LANGUAGES)[number];

const LANGUAGE_SET = new Set<string>(FACE_AGE_LANGUAGES);

/** Telegram and legacy codes that face-age names differently. */
const ALIASES: Record<string, FaceAgeLanguage> = {
  nb: "no",
  nn: "no",
  fil: "tl",
  in: "id",
  iw: "he",
  ua: "uk",
};

/**
 * Map a Telegram `language_code` (for example `fa`, `pt-br`, `zh-hans`)
 * to a face-age language. Unknown codes fall back to English.
 */
export function mapTelegramLanguage(code: string | null | undefined): FaceAgeLanguage {
  if (!code) return "en";
  const normalized = code.trim().toLowerCase().replace(/_/g, "-");
  if (!normalized) return "en";
  const primary = normalized.split("-")[0] ?? "";
  const aliased = ALIASES[primary] ?? primary;
  if (LANGUAGE_SET.has(aliased)) return aliased as FaceAgeLanguage;
  return "en";
}

/** face-age switches the widget to RTL for Persian, Arabic, and Urdu. */
export function isRtlLanguage(code: string): boolean {
  return code === "fa" || code === "ar" || code === "ur";
}

export function resolveLanguage(options: {
  telegramCode?: string | null;
  queryCode?: string | null;
  navigatorCode?: string | null;
  insideTelegram: boolean;
}): FaceAgeLanguage {
  if (options.insideTelegram) {
    return mapTelegramLanguage(options.telegramCode);
  }
  return mapTelegramLanguage(options.queryCode || options.navigatorCode);
}
