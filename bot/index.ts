import { config as loadEnv } from "dotenv";
import { createBot } from "./create-bot";
import { readServerConfig } from "./config";

loadEnv({ path: ".env.local" });
loadEnv();

const config = readServerConfig(process.env);
if (!config.botToken) {
  console.error("BOT_TOKEN is missing. Add it to .env.local. The README explains long polling and webhooks.");
  process.exit(1);
}

const bot = createBot(config.botToken, {
  miniAppUrl: config.miniAppUrl,
  orderBaseUrl: config.orderBaseUrl,
});

console.log("Skin scanner bot is long-polling. Stop it with Ctrl+C.");
if (!config.miniAppUrl) console.log("MINI_APP_URL is empty. /start will explain how to set it.");
if (config.miniAppUrl.startsWith("http://") && !config.miniAppUrl.includes("localhost")) {
  console.log("Telegram only opens HTTPS Mini App URLs. Use an HTTPS tunnel or a deployed URL.");
}

await bot.start();
