import type { FaceAgeCartLine, FaceAgeProduct } from "face-age";

export interface ScannerHandlers {
  onAddToCart: (lines: FaceAgeCartLine[]) => void;
  onCheckout: (lines: FaceAgeCartLine[]) => void;
  onAnalysis: (analysis: unknown) => void;
}

export interface ScannerMountOptions {
  clientId: string;
  currency: string;
  height: string;
  showCamera: boolean;
  products: FaceAgeProduct[];
  privacyUrl?: string;
  handlers: ScannerHandlers;
}

/**
 * Render Face Age directly into `#FaceAge-module`.
 * The SDK creates its own internal iframe; this function does not wrap or replace it.
 */
export async function mountScanner(options: ScannerMountOptions): Promise<void> {
  const faceAgeModule = await import("face-age");
  const FaceAge = faceAgeModule.default;
  const faceAge = new FaceAge({
    elementId: "FaceAge-module",
    faceageId: options.clientId,
    displayModel: "section",
    language: "en",
    height: options.height,
    currency: options.currency,
    quiz: false,
    showProducts: true,
    showRoutine: true,
    showAddToCard: true,
    showCamera: options.showCamera,
    showUpload: true,
    ...(options.privacyUrl ? { privacyUrl: options.privacyUrl } : {}),
  });

  faceAge.render();
  faceAge.API.setCustomProducts(options.products);
  // face-age 2.4.13+ clears productLists inside submitSkinAnalyze. The result
  // callback runs after that clear, which is when the catalog has to go back
  // so the Products tab can recommend this shop's shelf.
  reapplyCatalogOnResult(faceAge.API, options.products, options.handlers.onAnalysis);
  void faceAge.onAddToCart((lines) => {
    options.handlers.onAddToCart(lines ?? []);
  });
  void faceAge.onCheckout((lines) => {
    options.handlers.onCheckout(lines ?? []);
  });
}

/**
 * Register the analysis result callback and put `products` back when it fires.
 * The preload from `setCustomProducts` does not survive the scan.
 */
export function reapplyCatalogOnResult(
  api: {
    setCustomProducts(products: FaceAgeProduct[]): void;
    getAdvisorData(callback: (data: { analysis: unknown }) => void): Promise<unknown>;
  },
  products: FaceAgeProduct[],
  onAnalysis: (analysis: unknown) => void,
): void {
  void api.getAdvisorData((data) => {
    api.setCustomProducts(products);
    onAnalysis(data.analysis);
  });
}

export function scannerHeight(viewportHeight: number): string {
  const available = Math.max(640, Math.round(viewportHeight - 220));
  return `${Math.min(available, 980)}px`;
}
