import { describe, expect, it } from "vitest";
import { formatOrderReply } from "../bot/order-reply";
import { processOrderHandoff } from "../bot/process-order";
import { signInitData, validateInitData } from "../bot/telegram-auth";
import { readServerConfig } from "../bot/config";
import { buildOrderPayload } from "../src/shared/order";
import { loadSampleCatalog } from "../src/shared/products";
import { translate } from "../src/shared/messages";

const token = "123456:TESTTOKEN";
const fixedInitData =
  "auth_date=1700000000&query_id=AAE123&user=%7B%22id%22%3A42%2C%22first_name%22%3A%22Ada%22%2C%22language_code%22%3A%22en%22%7D&hash=97c5568acf6a0f558d3265812fdb2cb1315fb70723ea0e3d36761b577ced07d9";

describe("initData", () => {
  it("accepts a known signed payload and rejects tampering", () => {
    const now = 1700000100;
    const check = validateInitData(fixedInitData, token, now);
    expect(check.ok).toBe(true);
    expect(check.user?.id).toBe(42);

    const user = JSON.stringify({ id: 7, language_code: "en" });
    const fields = { auth_date: String(now), query_id: "Q1", user };
    const hash = signInitData(fields, token);
    const initData = new URLSearchParams({ ...fields, hash }).toString();
    expect(validateInitData(initData, token, now).ok).toBe(true);
    expect(validateInitData(initData.replace("Q1", "Q2"), token, now).ok).toBe(false);
    expect(validateInitData(initData, token, now + 60 * 60 * 48).reason).toBe("expired");
  });
});

describe("order reply", () => {
  const payload = buildOrderPayload({
    action: "add_to_cart",
    shop: "Lumen <Atelier>",
    currency: "$",
    lines: [{ id: "cloud-serum" }],
    catalog: loadSampleCatalog().products,
    shareResults: false,
  });

  it("includes an order link and no photo or score by default", () => {
    const text = formatOrderReply(payload, "https://shop.example/checkout");
    expect(text).toContain("https://shop.example/checkout?items=cloud-serum");
    expect(text).toContain(translate("botOrderTitle"));
    expect(text).toContain(translate("botNoPhoto"));
    expect(text).not.toContain("skin age");
    expect(text).not.toContain("<Atelier>");
    expect(text).toContain("&lt;Atelier&gt;");
  });

  it("includes a cosmetic summary only after an explicit share", () => {
    const shared = formatOrderReply(
      {
        ...payload,
        shareResults: true,
        summary: { skinAge: 36, damagePercentage: 12, problems: [{ key: "acne", title: "Acne", score: 9 }] },
      },
      "https://shop.example/checkout",
    );
    expect(shared).toContain(translate("botSkinAge", { value: 36 }));
    expect(shared).toContain("Acne: 9");
    expect(shared).toContain(translate("botNotDiagnosis"));
  });
});

describe("processOrderHandoff", () => {
  it("messages the signed Telegram user and ignores injected photos", async () => {
    const sent: Array<{ chatId: number; text: string }> = [];
    const result = await processOrderHandoff({
      botToken: token,
      nowSeconds: 1700000100,
      orderBaseUrl: "https://shop.example/checkout",
      body: {
        initData: fixedInitData,
        payload: {
          v: 1,
          type: "order",
          action: "checkout",
          lang: "en",
          shop: "Lumen Atelier",
          currency: "$",
          shareResults: false,
          items: [
            {
              id: "night-repair",
              title: "Night Repair Cream",
              price: 54,
              qty: 1,
              url: "https://getfaceage.com/?product=night-repair",
              image: "data:image/png;base64,aaaa",
            },
          ],
        },
      },
      sendMessage: async (chatId, text) => {
        sent.push({ chatId, text });
      },
    });
    expect(result).toEqual({ status: 200, ok: true });
    expect(sent[0]?.chatId).toBe(42);
    expect(sent[0]?.text).not.toContain("base64");
    expect(sent[0]?.text).toContain("Night Repair Cream");
  });

  it("rejects a missing signature", async () => {
    const result = await processOrderHandoff({
      botToken: token,
      body: { initData: "auth_date=1&user=%7B%22id%22%3A1%7D&hash=ab", payload: { v: 1 } },
      sendMessage: async () => undefined,
    });
    expect(result.status).toBe(401);
  });
});

describe("server config", () => {
  it("reads bot settings without inventing a token", () => {
    expect(readServerConfig({}).botToken).toBe("");
    expect(readServerConfig({ BOT_TOKEN: " abc ", ORDER_BASE_URL: "https://shop.example" })).toMatchObject({
      botToken: "abc",
      orderBaseUrl: "https://shop.example",
    });
  });
});
