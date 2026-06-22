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
      "@lootlog/api-helpers/auth/verify-jwt":
        "../../packages/api-helpers/src/lib/auth/utils/verify-jwt.ts",
    },
  }),
  plugins: [swc.vite(swcPluginOptions)],
});
