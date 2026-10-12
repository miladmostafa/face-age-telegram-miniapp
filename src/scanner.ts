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
    showCamera: true,
    showUpload: true,
    ...(options.privacyUrl ? { privacyUrl: options.privacyUrl } : {}),
  });

  faceAge.render();
  faceAge.API.setCustomProducts(options.products);
  void faceAge.API.getAdvisorData((data) => {
    options.handlers.onAnalysis(data.analysis);
  });
  void faceAge.onAddToCart((lines) => {
    options.handlers.onAddToCart(lines ?? []);
  });
  void faceAge.onCheckout((lines) => {
    options.handlers.onCheckout(lines ?? []);
  });
}

export function scannerHeight(viewportHeight: number): string {
  const available = Math.max(640, Math.round(viewportHeight - 220));
  return `${Math.min(available, 980)}px`;
}
