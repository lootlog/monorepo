import path from "node:path";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

const swcPluginOptions = {
  module: {
    type: "es6",
  },
  jsc: {
    parser: {
      syntax: "typescript",
      decorators: true,
      dynamicImport: true,
    },
    transform: {
      legacyDecorator: true,
      decoratorMetadata: true,
    },
  },
} satisfies Parameters<typeof swc.vite>[0];

export default defineConfig({
  oxc: false,
  resolve: {
    alias: {
      src: path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    pool: "forks",
    fileParallelism: true,
    include: ["src/**/*.spec.ts"],
    exclude: ["node_modules/**", "dist/**"],
    setupFiles: [path.resolve(__dirname, "./vitest.setup.ts")],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
  plugins: [swc.vite(swcPluginOptions)],
});
