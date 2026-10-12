import { describe, expect, it } from "vitest";
import { deliverOrder } from "../src/shared/handoff";
import type { OrderPayload } from "../src/shared/order";

const payload: OrderPayload = {
  v: 1,
  type: "order",
  action: "add_to_cart",
  lang: "en",
  shop: "Lumen Atelier",
  currency: "$",
  items: [{ id: "cloud-serum", title: "Cloud Serum", price: 42, qty: 1, url: "https://getfaceage.com/?product=cloud-serum" }],
  shareResults: false,
};

describe("deliverOrder", () => {
  it("stops after sendData when Telegram closes the Mini App", async () => {
    const calls: string[] = [];
    let hidden = false;
    const channel = await deliverOrder("{}", payload, {
      initData: "signed",
      sendData: () => {
        calls.push("send");
        hidden = true;
      },
      postOrder: async () => {
        calls.push("post");
        return true;
      },
      isHidden: () => hidden,
      delay: async () => undefined,
    });
    expect(channel).toBe("sendData");
    expect(calls).toEqual(["send"]);
  });

  it("posts to the bot when sendData leaves the page open", async () => {
    const calls: string[] = [];
    const channel = await deliverOrder("{}", payload, {
      initData: "signed",
      sendData: () => calls.push("send"),
      postOrder: async () => {
        calls.push("post");
        return true;
      },
      isHidden: () => false,
      delay: async () => undefined,
    });
    expect(channel).toBe("bot");
    expect(calls).toEqual(["send", "post"]);
  });

  it("previews the order outside Telegram", async () => {
    const channel = await deliverOrder("{}", payload, {});
    expect(channel).toBe("preview");
  });
});
