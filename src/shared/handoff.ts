import type { OrderPayload } from "./order";

export type HandoffChannel = "sendData" | "bot" | "preview";

export interface HandoffTransport {
  initData?: string;
  sendData?: (data: string) => void;
  postOrder?: (initData: string, payload: OrderPayload) => Promise<boolean>;
  /** Register a callback for page hide. Return an unsubscribe function. */
  onPageHide?: (listener: () => void) => () => void;
  delay?: (ms: number) => Promise<void>;
  isHidden?: () => boolean;
}

const FALLBACK_WAIT_MS = 800;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Prefer Telegram.WebApp.sendData, which closes the Mini App when it is opened
 * from a keyboard button. If the page stays open, ask our bot endpoint to
 * message the chat. Otherwise leave a local preview.
 */
export async function deliverOrder(
  encoded: string,
  payload: OrderPayload,
  transport: HandoffTransport,
): Promise<HandoffChannel> {
  let hidden = transport.isHidden?.() ?? false;
  const stop = transport.onPageHide?.(() => {
    hidden = true;
  });

  if (transport.sendData && transport.initData) {
    try {
      transport.sendData(encoded);
      await (transport.delay ?? wait)(FALLBACK_WAIT_MS);
      stop?.();
      if (hidden || transport.isHidden?.()) return "sendData";
    } catch {
      stop?.();
    }
  } else {
    stop?.();
  }

  if (transport.postOrder && transport.initData) {
    try {
      const delivered = await transport.postOrder(transport.initData, payload);
      if (delivered) return "bot";
    } catch {
      return "preview";
    }
  }
  return "preview";
}
