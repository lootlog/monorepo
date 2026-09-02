import { defineConfig } from "vitest/config";
import { createNestVitestConfig } from "../../tools/vitest/create-nest-vitest-config.mjs";

const nestConfig = createNestVitestConfig({
  rootDir: import.meta.dirname,
  include: ["src/**/*.spec.ts"],
  setupFiles: ["./test/vitest.setup.ts"],
});

export default defineConfig({
  ...nestConfig,
  test: {
    ...nestConfig.test,
    exclude: [
      "node_modules/**",
      "dist/**",
      "src/database/drizzle/adoption.spec.ts",
    ],
  },
});
