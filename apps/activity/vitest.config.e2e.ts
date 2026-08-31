import { defineConfig } from "vitest/config";
import { createNestVitestConfig } from "../../tools/vitest/create-nest-vitest-config.mjs";

const nestConfig = createNestVitestConfig({
  rootDir: import.meta.dirname,
  include: ["test/**/*.e2e-spec.ts"],
  fileParallelism: false,
  setupFiles: ["./vitest.setup.ts"],
});

export default defineConfig({
  ...nestConfig,
  test: {
    ...nestConfig.test,
    exclude: [
      ...(nestConfig.test?.exclude ?? []),
      "test/database-cutover.e2e-spec.ts",
    ],
  },
});
