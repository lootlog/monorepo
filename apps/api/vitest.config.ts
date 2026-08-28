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
      "@lootlog/api-helpers/permissions":
        "../../packages/api-helpers/src/lib/permissions/can-view-npc-timer.ts",
    },
    setupFiles: ["./test/vitest.setup.ts"],
  }),
  plugins: [swc.vite(swcPluginOptions)],
});
