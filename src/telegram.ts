import { cssVariableMap, themeVars, type ThemeInput, type ThemeVars } from "./shared/theme";

export interface TelegramWebAppUser {
  id?: number;
  language_code?: string;
  first_name?: string;
}

export interface TelegramMainButton {
  show(): void;
  hide(): void;
  enable(): void;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
  setParams(params: {
    text?: string;
    color?: string;
    text_color?: string;
    is_visible?: boolean;
    is_active?: boolean;
  }): void;
}

export interface TelegramWebApp {
  ready(): void;
  expand(): void;
  close(): void;
  sendData(data: string): void;
  initData: string;
  initDataUnsafe: { user?: TelegramWebAppUser };
  colorScheme?: "light" | "dark";
  themeParams: ThemeInput;
  platform?: string;
  version?: string;
  MainButton: TelegramMainButton;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  onEvent?(event: string, callback: () => void): void;
  offEvent?(event: string, callback: () => void): void;
  disableVerticalSwipes?(): void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function readTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function isInsideTelegram(webApp: TelegramWebApp | null): boolean {
  return Boolean(webApp?.initData);
}

/** Phones and in-app webviews are the platforms where camera access is unreliable. */
export function prefersUploadFallback(platform: string | undefined): boolean {
  const value = (platform ?? "").toLowerCase();
  return value === "ios" || value === "android" || value === "android_x" || value === "weba" || value === "webk";
}

export function applyTelegramTheme(webApp: TelegramWebApp | null, scheme?: "light" | "dark"): ThemeVars {
  const vars = themeVars(webApp?.themeParams, scheme ?? webApp?.colorScheme);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(cssVariableMap(vars))) {
    root.style.setProperty(key, value);
  }
  root.dataset.theme = vars.scheme;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", vars.header);
  try {
    webApp?.setHeaderColor?.(vars.header);
    webApp?.setBackgroundColor?.(vars.bg);
  } catch {
    // Some Telegram clients reject custom header colors until ready() settles.
  }
  return vars;
}

export function bindThemeUpdates(webApp: TelegramWebApp | null, onChange: (vars: ThemeVars) => void): void {
  if (!webApp?.onEvent) return;
  webApp.onEvent("themeChanged", () => {
    onChange(applyTelegramTheme(webApp));
  });
}
