import { defineConfig, loadEnv } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import path from "node:path";
import monkey from "vite-plugin-monkey";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { readFileSync } from "node:fs";

const SENTRY_APPLICATION_KEY = "lootlog-game-client";
const gameClientPackage = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const shouldAnalyzeBundle =
    env.ANALYZE === "1" || process.env.ANALYZE === "1";
  const useFastLocalMinifier =
    env.FAST_BUILD === "1" || process.env.FAST_BUILD === "1";
  const commitSha =
    env.VITE_COMMIT_SHA ||
    env.WORKERS_CI_COMMIT_SHA ||
    process.env.WORKERS_CI_COMMIT_SHA ||
    "";
  const runtimeVersion =
    env.VITE_GAME_CLIENT_VERSION ||
    commitSha ||
    process.env.npm_package_version ||
    "development";
  const buildTimestamp = new Date().toISOString();
  return {
    define: {
      "import.meta.env.VITE_BUILD_TIMESTAMP": JSON.stringify(buildTimestamp),
      "import.meta.env.VITE_COMMIT_SHA": JSON.stringify(commitSha),
      "import.meta.env.VITE_GAME_CLIENT_PACKAGE_VERSION": JSON.stringify(
        gameClientPackage.version,
      ),
      "import.meta.env.VITE_GAME_CLIENT_VERSION":
        JSON.stringify(runtimeVersion),
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
      minify: useFastLocalMinifier ? "oxc" : "terser",
      sourcemap: false,
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
          icon: "https://lootlog.pl/brand/lootlog-icon-192.png",
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
      ...(shouldAnalyzeBundle
        ? [
            visualizer({
              filename: path.resolve(
                __dirname,
                "../../artifacts/game-client/bundle-stats.html",
              ),
              gzipSize: true,
              brotliSize: true,
            }),
          ]
        : []),
      sentryVitePlugin({
        applicationKey: SENTRY_APPLICATION_KEY,
        bundleSizeOptimizations: {
          excludeDebugStatements: true,
          excludeReplayIframe: true,
          excludeReplayShadowDom: true,
          excludeTracing: true,
        },
        release: {
          create: false,
          inject: true,
          name: runtimeVersion,
        },
        silent: true,
        sourcemaps: {
          disable: true,
        },
        telemetry: false,
      }),
    ],
  };
});
