import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config.ts";

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ["src/**/*.renders.tsx"],
    setupFiles: ["./src/test/render-counter.ts", "./src/test/setup.ts"],
    fileParallelism: false,
  },
});
