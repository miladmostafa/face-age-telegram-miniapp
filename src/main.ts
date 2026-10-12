import "./style.css";
import { readClientId, readOptionalEnv } from "./config";
import { deliverOrder, type HandoffChannel } from "./shared/handoff";
import { translate } from "./shared/messages";
import {
  buildOrderLink,
  buildOrderPayload,
  encodeOrderPayload,
  formatPrice,
  type CartLine,
  type OrderAction,
  type OrderPayload,
} from "./shared/order";
import { assertCatalog, loadSampleCatalog, resolveCatalog, type CatalogProduct } from "./shared/products";
import { sanitizeAnalysis, type SkinSummary } from "./shared/analysis";
import { mountScanner, scannerHeight } from "./scanner";
import {
  applyTelegramTheme,
  bindThemeUpdates,
  isInsideTelegram,
  prefersUploadFallback,
  readTelegramWebApp,
  type TelegramWebApp,
} from "./telegram";

const catalog = loadSampleCatalog();
assertCatalog(catalog);

const webApp = readTelegramWebApp();
const insideTelegram = isInsideTelegram(webApp);
const params = new URLSearchParams(window.location.search);

let theme = applyTelegramTheme(webApp);
bindThemeUpdates(webApp, (next) => {
  theme = next;
  webApp?.MainButton.setParams({
    color: next.accent,
    text_color: next.accentText,
  });
});

const shopName = readOptionalEnv(import.meta.env.VITE_SHOP_NAME) || catalog.shopName;
const currency = readOptionalEnv(import.meta.env.VITE_CURRENCY) || catalog.currency;
const clientId = readClientId(import.meta.env.VITE_FACEAGE_CLIENT_ID);
const forceSetupPreview = !insideTelegram && params.get("preview") === "setup";

function requiredElement<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Mini App markup is missing ${selector}`);
  return node;
}

const setup = requiredElement<HTMLElement>("#setup");
const scanner = requiredElement<HTMLElement>("#scanner");
const receipt = requiredElement<HTMLElement>("#receipt");
const demo = requiredElement<HTMLElement>("#demo");
requiredElement<HTMLElement>("#FaceAge-module");
requiredElement<HTMLElement>("#shelf");

fillStaticCopy();
renderShelf(catalog.products);

webApp?.ready();
webApp?.expand();
try {
  webApp?.disableVerticalSwipes?.();
} catch {
  // Optional on older Telegram clients.
}

let summary: SkinSummary | null = null;
let lastLines: CartLine[] = [];
let sending = false;

const shareBox = document.querySelector<HTMLInputElement>("#share-results");

function currentLinesOrLast(lines: CartLine[]): CartLine[] {
  return lines.length > 0 ? lines : lastLines;
}

async function handoff(action: OrderAction, lines: CartLine[]): Promise<void> {
  const selected = currentLinesOrLast(lines);
  if (selected.length === 0 || sending) return;
  sending = true;
  lastLines = selected;
  const shareResults = Boolean(shareBox?.checked);
  try {
    const payload = buildOrderPayload({
      action,
      shop: shopName,
      currency,
      lines: selected,
      catalog: catalog.products,
      shareResults,
      summary: shareResults ? summary : null,
    });
    if (payload.items.length === 0) return;
    const encoded = encodeOrderPayload(payload);
    renderReceipt(payload, "pending");
    const channel = await deliverOrder(encoded, payload, {
      initData: webApp?.initData,
      sendData: webApp ? (data) => webApp.sendData(data) : undefined,
      postOrder: postOrderToBot,
      onPageHide: (listener) => {
        window.addEventListener("pagehide", listener);
        return () => window.removeEventListener("pagehide", listener);
      },
      isHidden: () => document.visibilityState === "hidden",
    });
    renderReceipt(payload, channel);
    revealMainButton(webApp, channel);
  } catch (error) {
    const message = error instanceof Error ? error.message : translate("receiptPreview");
    receipt.hidden = false;
    receipt.textContent = message;
  } finally {
    sending = false;
  }
}

function revealMainButton(app: TelegramWebApp | null, channel: HandoffChannel): void {
  if (!app || channel === "sendData") return;
  app.MainButton.setParams({
    text: translate("mainButton"),
    color: theme.accent,
    text_color: theme.accentText,
    is_visible: true,
    is_active: true,
  });
  app.MainButton.show();
}

async function postOrderToBot(initData: string, payload: OrderPayload): Promise<boolean> {
  const response = await fetch("/api/order", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ initData, payload }),
  });
  return response.ok;
}

if (webApp) {
  const onMainButton = () => {
    void handoff("checkout", lastLines);
  };
  webApp.MainButton.onClick(onMainButton);
}

document.querySelector<HTMLButtonElement>("#demo-order")?.addEventListener("click", () => {
  const first = catalog.products[0];
  if (!first) return;
  void handoff("add_to_cart", [{ id: first.id }]);
});

if (!clientId || forceSetupPreview) {
  setup.hidden = false;
  scanner.hidden = true;
  demo.hidden = true;
} else {
  setup.hidden = true;
  scanner.hidden = false;
  demo.hidden = insideTelegram;
  const resolved = resolveCatalog(catalog, window.location.origin);
  try {
    await mountScanner({
      clientId,
      currency,
      height: scannerHeight(window.innerHeight),
      products: resolved.products,
      privacyUrl: privacyLink(),
      handlers: {
        onAnalysis: (analysis) => {
          summary = sanitizeAnalysis(analysis);
        },
        onAddToCart: (lines) => {
          void handoff("add_to_cart", lines);
        },
        onCheckout: (lines) => {
          void handoff("checkout", lines);
        },
      },
    });
  } catch (error) {
    const note = document.querySelector<HTMLElement>("#camera-note");
    if (note) {
      note.textContent = error instanceof Error ? error.message : "The skin scanner could not start.";
    }
  }
}

function privacyLink(): string | undefined {
  try {
    const url = new URL(window.location.href);
    url.hash = "privacy";
    return url.toString();
  } catch {
    return undefined;
  }
}

function fillStaticCopy(): void {
  document.title = `${translate("title")} · ${shopName}`;
  text("#eyebrow", translate("eyebrow"));
  text("#title", translate("title"));
  text("#lede", translate("lede"));
  text("#shop-name", shopName);
  const mobile = prefersUploadFallback(webApp?.platform);
  text("#camera-note", translate(mobile ? "cameraNoteMobile" : "cameraNote"));
  text("#setup-title", translate("setupTitle"));
  text("#setup-body", translate("setupBody"));
  text("#setup-step-1", translate("setupStep1"));
  text("#setup-step-2", translate("setupStep2"));
  text("#setup-step-3", translate("setupStep3"));
  text("#share-label", translate("shareLabel"));
  text("#share-hint", translate("shareHint"));
  text("#shelf-title", translate("shelfTitle"));
  text("#shelf-body", translate("shelfBody"));
  text("#demo-note", translate("demoNote"));
  text("#demo-order", translate("demoButton"));
  text("#privacy-title", translate("privacyTitle"));
  text("#privacy-p1", translate("privacyP1"));
  text("#privacy-p2", translate("privacyP2"));
  text("#privacy-p3", translate("privacyP3"));
}

function renderShelf(products: CatalogProduct[]): void {
  const list = document.querySelector<HTMLElement>("#shelf-list");
  if (!list) return;
  list.replaceChildren();
  for (const product of products) {
    const item = document.createElement("li");
    const image = document.createElement("img");
    image.src = product.image;
    image.alt = product.title;
    image.width = 64;
    image.height = 64;
    const copy = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = product.title;
    const detail = document.createElement("span");
    detail.textContent = product.description ?? "";
    const price = document.createElement("b");
    price.textContent = formatPrice(currency, product.price, product.offerPrice);
    copy.append(name, detail);
    item.append(image, copy, price);
    list.append(item);
  }
}

function renderReceipt(payload: OrderPayload, channel: HandoffChannel | "pending"): void {
  receipt.hidden = false;
  receipt.replaceChildren();
  const heading = document.createElement("h2");
  heading.textContent = translate("receiptTitle");
  const status = document.createElement("p");
  const statusKey =
    channel === "pending"
      ? "receiptPending"
      : channel === "sendData"
        ? "receiptSendData"
        : channel === "bot"
          ? "receiptBot"
          : "receiptPreview";
  status.textContent = translate(statusKey);
  const list = document.createElement("ol");
  for (const item of payload.items) {
    const row = document.createElement("li");
    const variant = item.variant ? ` (${Object.values(item.variant).join(", ")})` : "";
    const qty = item.qty > 1 ? ` × ${item.qty}` : "";
    row.textContent = `${item.title}${qty}${variant} — ${formatPrice(payload.currency, item.price, item.offerPrice)}`;
    list.append(row);
  }
  receipt.append(heading, status, list);
  const link = buildOrderLink(payload.items, undefined);
  if (link) {
    const anchor = document.createElement("a");
    anchor.href = link;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.textContent = translate("botComplete");
    receipt.append(anchor);
  }
  if (payload.shareResults) {
    const note = document.createElement("p");
    note.textContent = translate(payload.summary ? "botShared" : "botSharedEmpty");
    receipt.append(note);
  }
}

function text(selector: string, value: string): void {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}
