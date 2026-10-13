import type { IncomingMessage, ServerResponse } from "node:http";
import { webhookCallback, type Bot } from "grammy";
import { createBot } from "../bot/create-bot";
import { readServerConfig } from "../bot/config";

let bot: Bot | null = null;

function getBot(): Bot | null {
  const config = readServerConfig(process.env);
  if (!config.botToken) return null;
  if (!bot) {
    bot = createBot(config.botToken, {
      miniAppUrl: config.miniAppUrl,
      orderBaseUrl: config.orderBaseUrl,
    });
  }
  return bot;
}

/** Vercel Node webhook. Point BotFather / setWebhook at https://<domain>/api/telegram */
export default function handler(req: IncomingMessage, res: ServerResponse): Promise<void> | void {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("allow", "POST");
    res.end("POST only");
    return;
  }
  const instance = getBot();
  if (!instance) {
    res.statusCode = 500;
    res.end("BOT_TOKEN is not set");
    return;
  }
  return webhookCallback(instance, "https")(req, res);
}
