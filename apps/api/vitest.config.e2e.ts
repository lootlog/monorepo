import { defineConfig } from "vitest/config";
import { createNestVitestConfig } from "../../tools/vitest/create-nest-vitest-config.mjs";

const nestConfig = createNestVitestConfig({
  rootDir: import.meta.dirname,
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
    exclude: [
      ...(nestConfig.test?.exclude ?? []),
      "test/database-cutover.e2e-spec.ts",
    ],
    globalSetup: "./test/vitest.global-setup.ts",
  },
});
