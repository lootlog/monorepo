import { defineConfig } from "vitest/config";
import { createNestVitestConfig } from "../../tools/vitest/create-nest-vitest-config.mjs";

export default defineConfig({
  ...createNestVitestConfig({
    rootDir: import.meta.dirname,
    include: ["test/**/*.e2e-spec.ts"],
    alias: {
      "@lootlog/battle-processor":
        "../../packages/battle-processor/src/index.ts",
    },
    fileParallelism: false,
    setupFiles: ["./vitest.setup.ts"],
  }),
});
