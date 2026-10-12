import { parseOrderPayload } from "../src/shared/order";
import { formatOrderReply } from "./order-reply";
import { validateInitData } from "./telegram-auth";

export interface OrderHandoffResult {
  status: number;
  ok: boolean;
  error?: string;
}

/**
 * Fallback when WebApp.sendData is unavailable (menu button or direct link).
 * initData is checked with the bot token before any chat message is sent.
 */
export async function processOrderHandoff(args: {
  body: unknown;
  botToken: string;
  orderBaseUrl?: string;
  nowSeconds?: number;
  sendMessage: (chatId: number, text: string) => Promise<void>;
}): Promise<OrderHandoffResult> {
  if (!args.body || typeof args.body !== "object") return { status: 400, ok: false, error: "invalid" };
  const body = args.body as { initData?: unknown; payload?: unknown };
  if (typeof body.initData !== "string" || !body.payload || typeof body.payload !== "object") {
    return { status: 400, ok: false, error: "invalid" };
  }

  const check = validateInitData(body.initData, args.botToken, args.nowSeconds);
  if (!check.ok || !check.user) return { status: 401, ok: false, error: check.reason ?? "unauthorized" };

  const payload = parseOrderPayload(JSON.stringify(body.payload));
  if (!payload) return { status: 400, ok: false, error: "payload" };

  await args.sendMessage(check.user.id, formatOrderReply(payload, args.orderBaseUrl));
  return { status: 200, ok: true };
}
