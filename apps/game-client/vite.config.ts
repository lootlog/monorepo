import { gameClientViteConfig } from "./vite.shared";
import { defineConfig, loadEnv } from "vite";
import path from "node:path";
import monkey from "vite-plugin-monkey";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");
  const shared = gameClientViteConfig(mode);
  const shouldAnalyzeBundle =
    env.ANALYZE === "1" || process.env.ANALYZE === "1";
  return {
    ...shared,
    server: {
      host: "localhost",
      hmr: {
        port: 3001,
        protocol: "ws",
      },
    },
    plugins: [
      ...(shared.plugins ?? []),
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
                import.meta.dirname,
                "../../artifacts/game-client/bundle-stats.html",
              ),
              gzipSize: true,
              brotliSize: true,
            }),
          ]
        : []),
    ],
  };
});
