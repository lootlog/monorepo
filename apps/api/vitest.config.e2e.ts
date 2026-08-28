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
  include: ["test/**/*.e2e-spec.ts"],
  alias: {
    "@lootlog/api-helpers/permissions":
      "../../packages/api-helpers/src/lib/permissions/can-view-npc-timer.ts",
  },
  fileParallelism: false,
  setupFiles: ["./test/vitest.setup.ts"],
});

export default defineConfig({
  ...nestConfig,
  test: {
    ...nestConfig.test,
    exclude: ["test/database-cutover.e2e-spec.ts"],
    globalSetup: "./test/vitest.global-setup.ts",
  },
  plugins: [swc.vite(swcPluginOptions)],
});
