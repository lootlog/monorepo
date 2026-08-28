import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";
import {
  createNestVitestConfig,
  nestSwcPluginOptions,
} from "../../tools/vitest/create-nest-vitest-config";

const swcPluginOptions = nestSwcPluginOptions satisfies Parameters<
  typeof swc.vite
>[0];

const nestConfig = createNestVitestConfig({
  rootDir: __dirname,
  include: ["test/app.e2e-spec.ts"],
  fileParallelism: false,
  setupFiles: ["./vitest.setup.ts"],
});

export default defineConfig({
  ...nestConfig,
  test: {
    ...nestConfig.test,
    globalSetup: "./test/vitest.global-setup.ts",
  },
  plugins: [swc.vite(swcPluginOptions)],
});
