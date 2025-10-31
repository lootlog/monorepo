import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import monkey from "vite-plugin-monkey";
import tailwindcss from "@tailwindcss/vite";

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
  ],
});
