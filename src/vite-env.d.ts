/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FACEAGE_CLIENT_ID?: string;
  readonly VITE_SHOP_NAME?: string;
  readonly VITE_CURRENCY?: string;
  readonly VITE_BOT_USERNAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
