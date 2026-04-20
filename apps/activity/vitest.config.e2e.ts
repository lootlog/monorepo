import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.e2e-spec.ts"],
    environment: "node",
    globals: true,
    fileParallelism: false,
    setupFiles: ["./vitest.setup.ts"],
  },
});
