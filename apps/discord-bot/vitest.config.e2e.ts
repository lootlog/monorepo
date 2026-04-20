import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.e2e-spec.ts"],
    fileParallelism: false,
    setupFiles: ["./vitest.setup.ts"],
  },
});
