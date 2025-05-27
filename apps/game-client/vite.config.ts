import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import monkey from "vite-plugin-monkey";

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
    react(),
    monkey({
      entry: "src/main.tsx",
      userscript: {
        icon: "https://vitejs.dev/logo.svg",
        namespace: "npm/vite-plugin-monkey",
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
