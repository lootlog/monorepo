/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;

  readonly VITE_DISCORD_CLIENT_ID: string;
  readonly VITE_DISCORD_BOT_PERMISSIONS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
