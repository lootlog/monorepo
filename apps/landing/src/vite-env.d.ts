interface ImportMetaEnv {
  readonly VITE_ADDON_URL?: string;
  readonly VITE_AUTH_SERVICE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
