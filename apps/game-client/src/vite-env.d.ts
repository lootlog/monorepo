/// <reference types="vite/client" />
/// <reference types="vite-plugin-monkey/client" />
//// <reference types="vite-plugin-monkey/global" />

interface ImportMetaEnv {
  readonly VITE_COMMIT_SHA: string;
  readonly VITE_GAME_CLIENT_VERSION: string;
  readonly VITE_PERF_FIXTURE: "0" | "1";
  readonly VITE_MARGONEM_ACCOUNT_VALIDATE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
