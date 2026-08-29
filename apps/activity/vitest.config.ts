import { defineConfig } from "vitest/config";
import { createNestVitestConfig } from "../../tools/vitest/create-nest-vitest-config.mjs";

export default defineConfig({
  ...createNestVitestConfig({
    rootDir: import.meta.dirname,
    include: ["src/**/*.spec.ts"],
    alias: {
      "prisma/generated/client": "./prisma/generated/client.ts",
    },
    setupFiles: ["./vitest.setup.ts"],
  }),
});
