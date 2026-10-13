import { Bot, Keyboard } from "grammy";
import { translate } from "../src/shared/messages";
import { parseOrderPayload } from "../src/shared/order";
import { formatOrderReply } from "./order-reply";

export interface BotRuntimeOptions {
  miniAppUrl: string;
  orderBaseUrl: string;
}

export function createBot(token: string, options: BotRuntimeOptions): Bot {
  if (!token.trim()) throw new Error("BOT_TOKEN is required");
  const bot = new Bot(token);

  bot.command("start", async (ctx) => {
    if (!options.miniAppUrl) {
      await ctx.reply(translate("botMissingUrl"));
      return;
    }
    const keyboard = new Keyboard().webApp(translate("botButton"), options.miniAppUrl).resized();
    await ctx.reply(translate("botWelcome"), { reply_markup: keyboard });
  });

  bot.on("message:web_app_data", async (ctx) => {
    const payload = parseOrderPayload(ctx.message.web_app_data.data);
    if (!payload) {
      await ctx.reply("I could not read that order. Open the skin scanner and add a product again.");
      return;
    }
    const text = formatOrderReply(payload, options.orderBaseUrl);
    await ctx.reply(text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
  });

  bot.catch((error) => {
    console.error(error.message);
  });

  return bot;
}
