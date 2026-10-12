import { createHmac, timingSafeEqual } from "node:crypto";

export interface InitDataUser {
  id: number;
  language_code?: string;
}

export interface InitDataCheck {
  ok: boolean;
  user?: InitDataUser;
  reason?: string;
}

const MAX_AGE_SECONDS = 60 * 60 * 24;

export function signInitData(fields: Record<string, string>, botToken: string): string {
  const dataCheckString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  return createHmac("sha256", secret).update(dataCheckString).digest("hex");
}

/** Validate Telegram Mini App initData. See https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app */
export function validateInitData(
  initData: string,
  botToken: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): InitDataCheck {
  if (!initData || !botToken) return { ok: false, reason: "missing" };
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const hash = params.get("hash");
  if (!hash || !/^[0-9a-f]+$/i.test(hash)) return { ok: false, reason: "hash" };

  const fields: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (key !== "hash") fields[key] = value;
  }
  const calculated = signInitData(fields, botToken);
  const left = Buffer.from(calculated, "hex");
  const right = Buffer.from(hash, "hex");
  if (left.length === 0 || left.length !== right.length || !timingSafeEqual(left, right)) {
    return { ok: false, reason: "signature" };
  }

  const authDate = Number(fields.auth_date ?? "");
  if (!Number.isFinite(authDate) || nowSeconds - authDate > MAX_AGE_SECONDS || authDate > nowSeconds + 60) {
    return { ok: false, reason: "expired" };
  }

  if (!fields.user) return { ok: false, reason: "user" };
  try {
    const parsed = JSON.parse(fields.user) as { id?: unknown; language_code?: unknown };
    if (typeof parsed.id !== "number" || !Number.isFinite(parsed.id)) return { ok: false, reason: "user" };
    return {
      ok: true,
      user: {
        id: parsed.id,
        ...(typeof parsed.language_code === "string" ? { language_code: parsed.language_code } : {}),
      },
    };
  } catch {
    return { ok: false, reason: "user" };
  }
}
