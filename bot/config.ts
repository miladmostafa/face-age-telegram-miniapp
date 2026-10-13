export interface ServerConfig {
  botToken: string;
  miniAppUrl: string;
  orderBaseUrl: string;
}

export function readServerConfig(env: Record<string, string | undefined>): ServerConfig {
  return {
    botToken: (env.BOT_TOKEN ?? "").trim(),
    miniAppUrl: (env.MINI_APP_URL ?? "").trim(),
    orderBaseUrl: (env.ORDER_BASE_URL ?? "").trim(),
  };
}
