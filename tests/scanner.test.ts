import { describe, expect, it, vi } from "vitest";
import { reapplyCatalogOnResult, scannerHeight } from "../src/scanner";
import type { FaceAgeProduct } from "face-age";

const serum: FaceAgeProduct = {
  id: "cloud-serum",
  url: "https://getfaceage.com/?product=cloud-serum",
  image: "https://shop.example/products/cloud-serum.svg",
  title: "Cloud Serum",
  price: 42,
};

describe("reapplyCatalogOnResult", () => {
  it("puts the catalog back when analysis results arrive, before the app reads them", () => {
    const calls: string[] = [];
    let deliver: ((data: { analysis: unknown }) => void) | undefined;
    const api = {
      setCustomProducts(products: FaceAgeProduct[]) {
        calls.push(`products:${products.map((product) => product.title).join(",")}`);
      },
      getAdvisorData(callback: (data: { analysis: unknown }) => void) {
        deliver = callback;
        return Promise.resolve();
      },
    };

    reapplyCatalogOnResult(api, [serum], (analysis) => {
      calls.push(`analysis:${JSON.stringify(analysis)}`);
    });
    expect(calls).toEqual([]);

    deliver?.({ analysis: { skinAge: 31, problems: [{ key: "dullness" }] } });

    expect(calls).toEqual([
      "products:Cloud Serum",
      'analysis:{"skinAge":31,"problems":[{"key":"dullness"}]}',
    ]);
  });

  it("still restores the catalog when the analysis handler throws", () => {
    const setCustomProducts = vi.fn();
    let deliver: ((data: { analysis: unknown }) => void) | undefined;
    reapplyCatalogOnResult(
      {
        setCustomProducts,
        getAdvisorData(callback) {
          deliver = callback;
          return Promise.resolve();
        },
      },
      [serum],
      () => {
        throw new Error("summary failed");
      },
    );

    expect(() => deliver?.({ analysis: [] })).toThrow("summary failed");
    expect(setCustomProducts).toHaveBeenCalledWith([serum]);
  });
});

describe("scannerHeight", () => {
  it("stays inside the page without collapsing the scanner", () => {
    expect(scannerHeight(500)).toBe("640px");
    expect(scannerHeight(1200)).toBe("980px");
  });
});
