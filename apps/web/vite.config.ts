import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

const vendorChunkGroups = {
  "vendor-react": [
    "/node_modules/react/",
    "/node_modules/react-dom/",
    "/node_modules/scheduler/",
  ],
  "vendor-tanstack": [
    "/node_modules/@tanstack/react-query",
    "/node_modules/@tanstack/react-query-devtools",
    "/node_modules/@tanstack/react-query-persist-client",
    "/node_modules/@tanstack/react-router",
    "/node_modules/@tanstack/router-core",
    "/node_modules/@tanstack/react-table",
    "/node_modules/@tanstack/react-virtual",
    "/node_modules/@tanstack/query-core",
    "/node_modules/nuqs/",
  ],
  "vendor-forms": [
    "/node_modules/react-hook-form/",
    "/node_modules/@hookform/resolvers/",
    "/node_modules/zod/",
  ],
  "vendor-i18n": ["/node_modules/i18next/", "/node_modules/react-i18next/"],
  "vendor-dates": [
    "/node_modules/date-fns/",
    "/node_modules/react-day-picker/",
  ],
  "vendor-icons": ["/node_modules/lucide-react/"],
  "vendor-motion": [
    "/node_modules/framer-motion/",
    "/node_modules/motion/",
    "/node_modules/gsap/",
    "/node_modules/three/",
    "/node_modules/ogl/",
  ],
  "vendor-ui": [
    "/node_modules/@radix-ui/",
    "/node_modules/cmdk/",
    "/node_modules/vaul/",
    "/node_modules/sonner/",
    "/node_modules/next-themes/",
  ],
  "vendor-style": [
    "/node_modules/class-variance-authority/",
    "/node_modules/clsx/",
    "/node_modules/tailwind-merge/",
    "/node_modules/tw-animate-css/",
  ],
  "vendor-lottie": ["/node_modules/lottie-react/", "/node_modules/lottie-web/"],
} as const;

function getChunkNameFromGroups(
  id: string,
  groups: Record<string, readonly string[]>,
) {
  for (const [chunkName, modulePaths] of Object.entries(groups)) {
    if (modulePaths.some((modulePath) => id.includes(modulePath))) {
      return chunkName;
    }
  }
}

function getVendorChunkName(id: string) {
  return getChunkNameFromGroups(id, vendorChunkGroups);
}

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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return getVendorChunkName(id);
          }
        },
      },
    },
  },
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  base: "/",
});
