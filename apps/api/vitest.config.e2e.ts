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
    include: ["test/**/*.e2e-spec.ts"],
    alias: {
      "@lootlog/hono-shared/permissions":
        "../../packages/hono-shared/src/permissions.ts",
      "prisma/generated/client": "./prisma/generated/client.ts",
    },
    fileParallelism: false,
    setupFiles: ["./test/vitest.setup.ts"],
  }),
  plugins: [swc.vite(swcPluginOptions)],
});
