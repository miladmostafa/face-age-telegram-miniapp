import type { SkinSummary } from "./analysis";
import type { CatalogProduct } from "./products";

export const ORDER_PAYLOAD_LIMIT = 4096;

export type OrderAction = "add_to_cart" | "checkout";

export interface CartLine {
  id: string | number;
  variable?: unknown;
}

export interface OrderItem {
  id: string;
  title: string;
  price: number;
  qty: number;
  url: string;
  offerPrice?: number;
  variant?: Record<string, string>;
}

export interface OrderPayload {
  v: 1;
  type: "order";
  action: OrderAction;
  lang: string;
  shop: string;
  currency: string;
  items: OrderItem[];
  shareResults: boolean;
  summary?: SkinSummary;
}

function clampText(value: string, max: number): string {
  let cleaned = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    cleaned += code >= 32 ? char : " ";
  }
  return cleaned.trim().slice(0, max);
}

function sanitizeVariant(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => typeof entry === "string" || typeof entry === "number")
    .slice(0, 6)
    .map(([key, entry]) => [clampText(key, 24), clampText(String(entry), 40)] as const)
    .filter(([key, entry]) => key && entry);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

function lineKey(id: string, variant: Record<string, string> | undefined): string {
  return `${id}:${JSON.stringify(variant ?? {})}`;
}

/**
 * Build the payload forwarded to the shop bot.
 * Only catalog products are included. Photos and raw analysis blobs are never copied.
 */
export function buildOrderPayload(input: {
  action: OrderAction;
  lang: string;
  shop: string;
  currency: string;
  lines: CartLine[];
  catalog: CatalogProduct[];
  shareResults: boolean;
  summary?: SkinSummary | null;
}): OrderPayload {
  const grouped = new Map<string, OrderItem>();
  for (const line of input.lines) {
    const id = String(line.id ?? "").trim();
    const product = input.catalog.find((item) => item.id === id);
    if (!product) continue;
    const variant = sanitizeVariant(line.variable);
    const key = lineKey(product.id, variant);
    const existing = grouped.get(key);
    if (existing) {
      existing.qty += 1;
      continue;
    }
    grouped.set(key, {
      id: product.id,
      title: clampText(product.title, 80),
      price: product.price,
      qty: 1,
      url: product.url,
      ...(product.offerPrice != null ? { offerPrice: product.offerPrice } : {}),
      ...(variant ? { variant } : {}),
    });
  }

  const payload: OrderPayload = {
    v: 1,
    type: "order",
    action: input.action,
    lang: clampText(input.lang || "en", 8) || "en",
    shop: clampText(input.shop, 60) || "Shop",
    currency: clampText(input.currency || "$", 8) || "$",
    items: [...grouped.values()].slice(0, 12),
    shareResults: input.shareResults,
  };
  if (input.shareResults && input.summary) payload.summary = input.summary;
  return payload;
}

export function encodeOrderPayload(payload: OrderPayload): string {
  let current: OrderPayload = payload;
  let encoded = JSON.stringify(current);
  if (encoded.length <= ORDER_PAYLOAD_LIMIT) return encoded;

  if (current.summary) {
    const { summary: _summary, ...rest } = current;
    current = rest;
    encoded = JSON.stringify(current);
  }
  if (encoded.length <= ORDER_PAYLOAD_LIMIT) return encoded;

  current = {
    ...current,
    items: current.items.map((item) => ({
      id: item.id,
      title: item.title.slice(0, 40),
      price: item.price,
      qty: item.qty,
      url: item.url.slice(0, 180),
      ...(item.offerPrice != null ? { offerPrice: item.offerPrice } : {}),
    })),
  };
  encoded = JSON.stringify(current);
  if (encoded.length > ORDER_PAYLOAD_LIMIT) {
    throw new Error("Order payload exceeds the Telegram sendData limit");
  }
  return encoded;
}

function isOrderItem(value: unknown): value is OrderItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<OrderItem>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    item.id.length <= 60 &&
    typeof item.title === "string" &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    item.price >= 0 &&
    typeof item.qty === "number" &&
    Number.isInteger(item.qty) &&
    item.qty > 0 &&
    item.qty <= 20 &&
    typeof item.url === "string"
  );
}

/** Accept only a known order object. Extra fields, including images, are dropped. */
export function parseOrderPayload(raw: string): OrderPayload | null {
  if (!raw || raw.length > ORDER_PAYLOAD_LIMIT) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Partial<OrderPayload> & { summary?: unknown };
  if (record.v !== 1 || record.type !== "order") return null;
  if (record.action !== "add_to_cart" && record.action !== "checkout") return null;
  if (!Array.isArray(record.items) || record.items.length === 0 || record.items.length > 12) return null;
  if (!record.items.every(isOrderItem)) return null;
  const shareResults = record.shareResults === true;
  const payload: OrderPayload = {
    v: 1,
    type: "order",
    action: record.action,
    lang: typeof record.lang === "string" ? record.lang.slice(0, 8) : "en",
    shop: typeof record.shop === "string" ? record.shop.slice(0, 60) : "Shop",
    currency: typeof record.currency === "string" ? record.currency.slice(0, 8) : "$",
    items: record.items.map((item) => ({
      id: item.id,
      title: item.title.slice(0, 80),
      price: item.price,
      qty: item.qty,
      url: item.url.slice(0, 300),
      ...(typeof item.offerPrice === "number" && item.offerPrice >= 0 ? { offerPrice: item.offerPrice } : {}),
      ...(item.variant && typeof item.variant === "object" ? { variant: sanitizeVariant(item.variant) } : {}),
    })),
    shareResults,
  };
  if (shareResults && record.summary && typeof record.summary === "object") {
    const summary = record.summary as SkinSummary;
    payload.summary = {
      ...(typeof summary.skinAge === "number" ? { skinAge: summary.skinAge } : {}),
      ...(typeof summary.damagePercentage === "number" ? { damagePercentage: summary.damagePercentage } : {}),
      problems: Array.isArray(summary.problems)
        ? summary.problems
            .slice(0, 13)
            .filter((problem) => problem && typeof problem.key === "string")
            .map((problem) => ({
              key: problem.key.slice(0, 40),
              ...(typeof problem.title === "string" ? { title: problem.title.slice(0, 80) } : {}),
              ...(typeof problem.score === "number" ? { score: problem.score } : {}),
            }))
        : [],
    };
  }
  return payload;
}

export function buildOrderLink(items: OrderItem[], orderBaseUrl: string | undefined): string | null {
  const base = (orderBaseUrl ?? "").trim();
  if (base) {
    try {
      const url = new URL(base);
      if (url.protocol === "https:" || url.protocol === "http:") {
        url.searchParams.set("items", items.map((item) => item.id).join(","));
        url.searchParams.set("source", "telegram-skin-scan");
        return url.toString();
      }
    } catch {
      // Fall through to the first product page.
    }
  }
  return items.find((item) => /^https?:\/\//.test(item.url))?.url ?? null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatPrice(currency: string, price: number, offerPrice?: number): string {
  const amount = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2));
  if (offerPrice != null && offerPrice < price) {
    return `${currency}${amount(offerPrice)} (${currency}${amount(price)})`;
  }
  return `${currency}${amount(price)}`;
}
