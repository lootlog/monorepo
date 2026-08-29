import { defineConfig } from "vitest/config";
import { createNestVitestConfig } from "../../tools/vitest/create-nest-vitest-config.mjs";

export default defineConfig({
  ...createNestVitestConfig({
    rootDir: import.meta.dirname,
    include: ["test/**/*.e2e-spec.ts"],
    fileParallelism: false,
    setupFiles: ["./vitest.setup.ts"],
  }),
});
