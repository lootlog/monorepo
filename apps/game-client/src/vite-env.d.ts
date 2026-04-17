/// <reference types="vite/client" />
/// <reference types="vite-plugin-monkey/client" />
//// <reference types="vite-plugin-monkey/global" />

interface ImportMetaEnv {
  readonly VITE_COMMIT_SHA: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
