import { defineConfig } from "vitest/config";
import { createNestVitestConfig } from "../../tools/vitest/create-nest-vitest-config.mjs";

const nestConfig = createNestVitestConfig({
  rootDir: import.meta.dirname,
  include: ["test/**/*.e2e-spec.ts"],
  fileParallelism: false,
  setupFiles: ["./test/vitest.setup.ts"],
});

export default defineConfig({
  ...nestConfig,
  test: {
    ...nestConfig.test,
    globalSetup: "./test/vitest.global-setup.ts",
  },
});
