/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SEARCH_API_URL: string;
  readonly VITE_AUTH_SERVICE_URL: string;
  readonly VITE_BATTLELOG_API_URL: string;
  readonly VITE_ACTIVITY_API_URL: string;
  readonly VITE_NOTIFICATIONS_API_URL: string;
  readonly VITE_ADDON_INSTALL_URL: string;
  readonly VITE_BATTLELOG_PUBLIC_URL: string;
  readonly VITE_GATEWAY_URL: string;
  readonly VITE_GATEWAY_SOCKET_PATH: string;

  readonly VITE_DISCORD_CLIENT_ID: string;
  readonly VITE_DISCORD_BOT_PERMISSIONS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
