import { defineConfig } from "vitest/config";
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
  ],
  "vendor-style": [
    "/node_modules/class-variance-authority/",
    "/node_modules/cn/",
    "/node_modules/clsx/",
    "/node_modules/tw-animate-css/",
  ],
  "vendor-lottie": ["/node_modules/lottie-react/", "/node_modules/lottie-web/"],
} as const;

const deferredModulePreloadChunks = [
  "vendor-forms",
  "vendor-lottie",
  "vendor-motion",
] as const;

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

function shouldDeferModulePreload(dep: string) {
  return deferredModulePreloadChunks.some((chunkName) =>
    dep.includes(chunkName),
  );
}

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    setupFiles: "./src/test/setup.ts",
  },
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
      // Path aliases
      {
        find: "@/components",
        replacement: path.resolve(import.meta.dirname, "./src/components"),
      },
      {
        find: "@/config",
        replacement: path.resolve(import.meta.dirname, "./src/config"),
      },
      {
        find: "@/constants",
        replacement: path.resolve(import.meta.dirname, "./src/constants"),
      },
      {
        find: "@/contexts",
        replacement: path.resolve(import.meta.dirname, "./src/contexts"),
      },
      {
        find: "@/enums",
        replacement: path.resolve(import.meta.dirname, "./src/enums"),
      },
      {
        find: "@/eventEmitter",
        replacement: path.resolve(import.meta.dirname, "./src/eventEmitter"),
      },
      {
        find: "@/features",
        replacement: path.resolve(import.meta.dirname, "./src/features"),
      },
      {
        find: "@/hooks",
        replacement: path.resolve(import.meta.dirname, "./src/hooks"),
      },
      {
        find: "@/i18n",
        replacement: path.resolve(import.meta.dirname, "./src/i18n"),
      },
      {
        find: "@/layout",
        replacement: path.resolve(import.meta.dirname, "./src/layout"),
      },
      {
        find: "@/lib",
        replacement: path.resolve(import.meta.dirname, "./src/lib"),
      },
      {
        find: "@/navigation",
        replacement: path.resolve(import.meta.dirname, "./src/navigation"),
      },
      {
        find: "@/providers",
        replacement: path.resolve(import.meta.dirname, "./src/providers"),
      },
      {
        find: "@/store",
        replacement: path.resolve(import.meta.dirname, "./src/store"),
      },
      {
        find: "@/themes",
        replacement: path.resolve(import.meta.dirname, "./src/themes"),
      },
      {
        find: "@/types",
        replacement: path.resolve(import.meta.dirname, "./src/types"),
      },
      {
        find: "@/utils",
        replacement: path.resolve(import.meta.dirname, "./src/utils"),
      },
    ],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client"],
  },
  build: {
    modulePreload: {
      resolveDependencies: (_filename, deps) =>
        deps.filter((dep) => !shouldDeferModulePreload(dep)),
    },
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
