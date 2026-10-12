import { describe, expect, it } from "vitest";
import { loadSampleCatalog } from "../src/shared/products";
import {
  buildOrderLink,
  buildOrderPayload,
  encodeOrderPayload,
  escapeHtml,
  parseOrderPayload,
} from "../src/shared/order";

const catalog = loadSampleCatalog().products;

describe("buildOrderPayload", () => {
  it("keeps catalog products and drops unknown lines", () => {
    const payload = buildOrderPayload({
      action: "add_to_cart",
      lang: "fa-IR",
      shop: "Lumen Atelier",
      currency: "$",
      lines: [
        { id: "cloud-serum", variable: { size: "30" } },
        { id: "cloud-serum", variable: { size: "30" } },
        { id: "not-a-product", variable: { image: "data:image/png;base64,aaaa" } },
      ],
      catalog,
      shareResults: false,
      summary: { skinAge: 31, problems: [{ key: "acne", score: 12 }] },
    });

    expect(payload.lang).toBe("fa-IR");
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({ id: "cloud-serum", qty: 2, variant: { size: "30" } });
    expect(payload.summary).toBeUndefined();
    expect(payload.shareResults).toBe(false);
    expect(JSON.stringify(payload)).not.toContain("data:image");
    expect(JSON.stringify(payload)).not.toContain("skinAge");
  });

  it("attaches a summary only when the shopper opts in", () => {
    const payload = buildOrderPayload({
      action: "checkout",
      lang: "en",
      shop: "Lumen Atelier",
      currency: "$",
      lines: [{ id: "eye-bright" }],
      catalog,
      shareResults: true,
      summary: { skinAge: 29, damagePercentage: 18, problems: [{ key: "darkCircle", title: "Dark circles", score: 22 }] },
    });
    expect(payload.shareResults).toBe(true);
    expect(payload.summary?.skinAge).toBe(29);
    expect(payload.summary?.problems[0]?.key).toBe("darkCircle");
  });
});

describe("parseOrderPayload", () => {
  it("drops photos and extra fields", () => {
    const raw = JSON.stringify({
      v: 1,
      type: "order",
      action: "add_to_cart",
      lang: "en",
      shop: "Lumen Atelier",
      currency: "$",
      shareResults: false,
      photo: "data:image/jpeg;base64,zzzz",
      items: [
        {
          id: "cloud-serum",
          title: "Cloud Serum",
          price: 42,
          offerPrice: 34,
          qty: 1,
          url: "https://getfaceage.com/?product=cloud-serum",
          image: "https://example.com/face.jpg",
        },
      ],
    });
    const parsed = parseOrderPayload(raw);
    expect(parsed?.items[0]?.id).toBe("cloud-serum");
    expect(parsed?.items[0]).not.toHaveProperty("image");
    expect(JSON.stringify(parsed)).not.toContain("base64");
    expect(JSON.stringify(parsed)).not.toContain("face.jpg");
  });

  it("rejects junk and oversized bodies", () => {
    expect(parseOrderPayload("not-json")).toBeNull();
    expect(parseOrderPayload("")).toBeNull();
    expect(parseOrderPayload(`{"v":1}`)).toBeNull();
    expect(parseOrderPayload("x".repeat(5000))).toBeNull();
  });
});

describe("order link and encoding", () => {
  it("builds a checkout link and escapes HTML", () => {
    const payload = buildOrderPayload({
      action: "add_to_cart",
      lang: "en",
      shop: "A & B",
      currency: "$",
      lines: [{ id: "pore-veil" }, { id: "calm-cleanser" }],
      catalog,
      shareResults: false,
    });
    const link = buildOrderLink(payload.items, "https://shop.example/checkout");
    expect(link).toContain("https://shop.example/checkout");
    expect(link).toContain("items=pore-veil%2Ccalm-cleanser");
    expect(escapeHtml(`<b>A & B</b>`)).toBe("&lt;b&gt;A &amp; B&lt;/b&gt;");
    expect(encodeOrderPayload(payload).length).toBeLessThanOrEqual(4096);
  });
});
