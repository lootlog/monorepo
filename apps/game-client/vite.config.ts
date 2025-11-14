import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import monkey from "vite-plugin-monkey";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "localhost",
    hmr: {
      port: 3001,
      protocol: "ws",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
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
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
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
});
