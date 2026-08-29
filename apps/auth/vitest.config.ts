import { defineConfig } from "vitest/config";
import { createNestVitestConfig } from "../../tools/vitest/create-nest-vitest-config.mjs";

export default defineConfig({
  ...createNestVitestConfig({
    rootDir: import.meta.dirname,
    include: ["src/**/*.spec.ts"],
    alias: {
      "@lootlog/api-helpers/auth/verify-jwt":
        "../../packages/api-helpers/src/lib/auth/utils/verify-jwt.ts",
    },
  }),
});
