import { loadEnv, type UserConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { readFileSync } from "node:fs";

const gameClientPackage = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

export function gameClientViteConfig(mode: string): UserConfig {
  const env = loadEnv(mode, import.meta.dirname, "");
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
    resolve: {
      alias: [
        { find: "@", replacement: path.resolve(import.meta.dirname, "./src") },
        {
          find: /^use-sync-external-store\/shim\/with-selector(\.js)?$/,
          replacement: path.resolve(
            import.meta.dirname,
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
    ],
  };
}
