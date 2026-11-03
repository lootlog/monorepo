import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";

type WikiViteConfigOptions = {
  /** Overrides the Worker's `vars` from `wrangler.jsonc`; `.env` still wins. */
  workerVars?: Record<string, string>;
};

export function createWikiViteConfig({
  workerVars,
}: WikiViteConfigOptions = {}) {
  return defineConfig({
    server: {
      host: "0.0.0.0",
      port: 3006,
    },
    preview: {
      host: "0.0.0.0",
      port: 3006,
    },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      tailwindcss(),
      cloudflare({
        viteEnvironment: { name: "ssr" },
        config: workerVars
          ? (config) => ({ vars: { ...config.vars, ...workerVars } })
          : undefined,
      }),
      tanstackStart(),
      viteReact(),
    ],
  });
}

export default createWikiViteConfig();
