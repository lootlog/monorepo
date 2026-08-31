import { defineConfig } from "vitest/config";
import { createNestVitestConfig } from "../../tools/vitest/create-nest-vitest-config.mjs";

export default defineConfig({
  ...createNestVitestConfig({
    rootDir: import.meta.dirname,
    include: ["src/**/*.spec.ts"],
    alias: {
      "@lootlog/api-helpers/permissions":
        "../../packages/api-helpers/src/lib/permissions/can-view-npc-timer.ts",
    },
    setupFiles: ["./test/vitest.setup.ts"],
  }),
});
