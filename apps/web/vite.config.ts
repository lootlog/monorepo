import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  preview: {
    port: 3000,
    host: "0.0.0.0",
  },
  resolve: {
    alias: [
      // Shim aliases for use-sync-external-store (React 19 has these built-in)
      {
        find: /^use-sync-external-store\/shim\/with-selector(\.js)?$/,
        replacement: path.resolve(
          __dirname,
          "./src/shims/use-sync-external-store-with-selector.ts",
        ),
      },
      {
        find: /^use-sync-external-store\/shim(\/index)?(\.js)?$/,
        replacement: path.resolve(
          __dirname,
          "./src/shims/use-sync-external-store-shim.ts",
        ),
      },
      // Path aliases
      {
        find: "@/components",
        replacement: path.resolve(__dirname, "./src/components"),
      },
      {
        find: "@/config",
        replacement: path.resolve(__dirname, "./src/config"),
      },
      {
        find: "@/constants",
        replacement: path.resolve(__dirname, "./src/constants"),
      },
      {
        find: "@/contexts",
        replacement: path.resolve(__dirname, "./src/contexts"),
      },
      { find: "@/enums", replacement: path.resolve(__dirname, "./src/enums") },
      {
        find: "@/eventEmitter",
        replacement: path.resolve(__dirname, "./src/eventEmitter"),
      },
      {
        find: "@/features",
        replacement: path.resolve(__dirname, "./src/features"),
      },
      { find: "@/hooks", replacement: path.resolve(__dirname, "./src/hooks") },
      { find: "@/i18n", replacement: path.resolve(__dirname, "./src/i18n") },
      {
        find: "@/layout",
        replacement: path.resolve(__dirname, "./src/layout"),
      },
      { find: "@/lib", replacement: path.resolve(__dirname, "./src/lib") },
      {
        find: "@/navigation",
        replacement: path.resolve(__dirname, "./src/navigation"),
      },
      {
        find: "@/providers",
        replacement: path.resolve(__dirname, "./src/providers"),
      },
      { find: "@/store", replacement: path.resolve(__dirname, "./src/store") },
      { find: "@/types", replacement: path.resolve(__dirname, "./src/types") },
      { find: "@/utils", replacement: path.resolve(__dirname, "./src/utils") },
    ],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client"],
  },
  plugins: [
    TanStackRouterVite(),
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    tailwindcss(),
  ],
  base: "/",
});
