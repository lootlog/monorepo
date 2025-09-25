/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SEARCH_API_URL: string;
  readonly VITE_BATTLELOG_API_URL: string;
  readonly VITE_ADDON_INSTALL_URL: string;

  readonly VITE_DISCORD_CLIENT_ID: string;
  readonly VITE_DISCORD_BOT_PERMISSIONS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
