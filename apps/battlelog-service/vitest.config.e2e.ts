import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@lootlog/battle-processor": path.resolve(
        __dirname,
        "../../packages/battle-processor/src/index.ts",
      ),
    },
  },
  test: {
    include: ["test/**/*.e2e-spec.ts"],
    environment: "node",
    fileParallelism: false,
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
