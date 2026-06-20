import { defineConfig, loadEnv } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import path from "node:path";
import monkey from "vite-plugin-monkey";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const commitSha =
    env.VITE_COMMIT_SHA ||
    env.WORKERS_CI_COMMIT_SHA ||
    process.env.WORKERS_CI_COMMIT_SHA ||
    "";

  return {
    define: {
      "import.meta.env.VITE_COMMIT_SHA": JSON.stringify(commitSha),
    },
    server: {
      host: "localhost",
      hmr: {
        port: 3001,
        protocol: "ws",
      },
    },
    resolve: {
      alias: [
        { find: "@", replacement: path.resolve(__dirname, "./src") },
        {
          find: /^use-sync-external-store\/shim\/with-selector(\.js)?$/,
          replacement: path.resolve(
            __dirname,
            "./src/shims/use-sync-external-store-with-selector.ts",
          ),
        },
        {
          find: /^use-sync-external-store\/shim(\/index)?(\.js)?$/,
          replacement: "react",
        },
      ],
    },
    build: {
      minify: "terser",
      terserOptions: {
        compress: {
          drop_debugger: true,
          passes: 1,
        },
      },
      target: "es2020",
    },
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      monkey({
        entry: "src/main.tsx",
        userscript: {
          icon: "https://vitejs.dev/logo.svg",
          namespace: "npm/vite-plugin-monkey",
          author: "Wildstylez & friends",
          name: "@lootlog/game-client",
          match: [
            "https://*.margonem.pl",
            "https://*.margonem.com",
            "https://*.margonem.pl/*",
            "https://*.margonem.com/*",
          ],
          exclude: [
            "http*://margonem.*/*",
            "http*://www.margonem.*/*",
            "http*://new.margonem.*/*",
            "http*://forum.margonem.*/*",
            "http*://commons.margonem.*/*",
            "http*://dev-commons.margonem.*/*",
          ],
        },
        build: {},
      }),
      visualizer({
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
      }),
    ],
  };
});
