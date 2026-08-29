import { defineConfig } from "vitest/config";
import { createNestVitestConfig } from "../../tools/vitest/create-nest-vitest-config.mjs";

export default defineConfig({
  ...createNestVitestConfig({
    rootDir: import.meta.dirname,
    include: ["src/**/*.spec.ts"],
    alias: {
      "@lootlog/battle-processor":
        "../../packages/battle-processor/src/index.ts",
      "@lootlog/nest-shared/decorators":
        "../../packages/nest-shared/src/decorators/index.ts",
      "@lootlog/nest-shared/redis":
        "../../packages/nest-shared/src/redis/index.ts",
      "@lootlog/nest-shared/validators/query-helpers":
        "../../packages/nest-shared/src/validators/query-helpers.ts",
    },
    setupFiles: ["./vitest.setup.ts"],
  }),
});
