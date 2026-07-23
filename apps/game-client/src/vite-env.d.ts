/// <reference types="vite/client" />
/// <reference types="vite-plugin-monkey/client" />
//// <reference types="vite-plugin-monkey/global" />

interface ImportMetaEnv {
  readonly VITE_BUILD_TIMESTAMP: string;
  readonly VITE_COMMIT_SHA: string;
  readonly VITE_GAME_CLIENT_PACKAGE_VERSION: string;
  readonly VITE_GAME_CLIENT_VERSION: string;
  readonly VITE_MARGONEM_ACCOUNT_VALIDATE_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
