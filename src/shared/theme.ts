export interface ThemeInput {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  section_bg_color?: string;
}

export interface ThemeVars {
  bg: string;
  text: string;
  muted: string;
  link: string;
  accent: string;
  accentText: string;
  card: string;
  header: string;
  line: string;
  scheme: "light" | "dark";
}

const LIGHT: ThemeVars = {
  bg: "#f4f1f6",
  text: "#1c1630",
  muted: "#655b73",
  link: "#b4236d",
  accent: "#ef3786",
  accentText: "#ffffff",
  card: "#ffffff",
  header: "#fff8fb",
  line: "#eadfe8",
  scheme: "light",
};

const DARK: ThemeVars = {
  bg: "#17141c",
  text: "#f6f1f8",
  muted: "#b7adbf",
  link: "#ff8cbc",
  accent: "#ef3786",
  accentText: "#ffffff",
  card: "#241f2b",
  header: "#211c27",
  line: "#3a3344",
  scheme: "dark",
};

function color(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) return trimmed;
  return fallback;
}

/** Map Telegram themeParams onto the Mini App shell. Invalid colors are ignored. */
export function themeVars(input: ThemeInput | null | undefined, scheme: "light" | "dark" | undefined): ThemeVars {
  const base = scheme === "dark" ? DARK : LIGHT;
  const theme = input ?? {};
  return {
    bg: color(theme.bg_color, base.bg),
    text: color(theme.text_color, base.text),
    muted: color(theme.hint_color, base.muted),
    link: color(theme.link_color, base.link),
    accent: color(theme.button_color, base.accent),
    accentText: color(theme.button_text_color, base.accentText),
    card: color(theme.section_bg_color ?? theme.secondary_bg_color, base.card),
    header: color(theme.header_bg_color ?? theme.bg_color, base.header),
    line: base.line,
    scheme: scheme === "dark" ? "dark" : "light",
  };
}

export function cssVariableMap(vars: ThemeVars): Record<string, string> {
  return {
    "--bg": vars.bg,
    "--text": vars.text,
    "--muted": vars.muted,
    "--link": vars.link,
    "--accent": vars.accent,
    "--accent-text": vars.accentText,
    "--card": vars.card,
    "--header": vars.header,
    "--line": vars.line,
  };
}
