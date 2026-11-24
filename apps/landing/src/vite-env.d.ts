interface ImportMetaEnv {
  readonly VITE_ADDON_URL?: string;
  readonly VITE_AUTH_SERVICE_URL?: string;
  readonly LANDING_DISCORD_MEMBER_COUNT: number | null;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
