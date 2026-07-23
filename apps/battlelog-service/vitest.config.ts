import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";
import {
  createNestVitestConfig,
  nestSwcPluginOptions,
} from "../../tools/vitest/create-nest-vitest-config";

const swcPluginOptions = nestSwcPluginOptions satisfies Parameters<
  typeof swc.vite
>[0];

export default defineConfig({
  ...createNestVitestConfig({
    rootDir: __dirname,
    include: ["src/**/*.spec.ts"],
    alias: {
      "@lootlog/battle-processor":
        "../../packages/battle-processor/src/index.ts",
      "@lootlog/nest-shared/decorators":
        "../../packages/nest-shared/src/decorators/index.ts",
      "@lootlog/nest-shared/redis":
        "../../packages/nest-shared/src/redis/index.ts",
      "@lootlog/nest-shared/validators/query-helpers":
        "../../packages/nest-shared/src/validators/query-helpers.ts",
    },
    setupFiles: ["./vitest.setup.ts"],
  }),
  plugins: [swc.vite(swcPluginOptions)],
});
