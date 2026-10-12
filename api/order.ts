import type { IncomingMessage, ServerResponse } from "node:http";
import { Bot } from "grammy";
import { readServerConfig } from "../bot/config";
import { processOrderHandoff } from "../bot/process-order";

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer | string) => {
      const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      size += buffer.length;
      if (size > 20_000) {
        reject(new Error("too-large"));
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, body: { ok: boolean; error?: string }): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

/**
 * Fallback handoff for Mini App launches that cannot use WebApp.sendData.
 * The photo never arrives here; only the sanitized order payload does.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("allow", "POST");
    res.end("POST only");
    return;
  }
  const config = readServerConfig(process.env);
  if (!config.botToken) {
    send(res, 500, { ok: false, error: "BOT_TOKEN is not set" });
    return;
  }
  try {
    const body = await readJsonBody(req);
    const bot = new Bot(config.botToken);
    const result = await processOrderHandoff({
      body,
      botToken: config.botToken,
      orderBaseUrl: config.orderBaseUrl,
      sendMessage: async (chatId, text) => {
        await bot.api.sendMessage(chatId, text, {
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
        });
      },
    });
    send(res, result.status, { ok: result.ok, ...(result.error ? { error: result.error } : {}) });
  } catch {
    send(res, 400, { ok: false, error: "bad-request" });
  }
}
