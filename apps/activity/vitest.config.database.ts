import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    hookTimeout: 180_000,
    include: ["test/database-cutover.e2e-spec.ts"],
    testTimeout: 180_000,
  },
});
