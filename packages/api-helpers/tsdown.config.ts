import { defineConfig } from "tsdown";

export default defineConfig({
  dts: true,
  entry: {
    auth: "src/lib/auth/utils/verify-jwt.ts",
    permissions: "src/lib/permissions/can-view-npc-timer.ts",
  },
  format: ["esm", "cjs"],
  outExtensions: ({ format }) => ({
    js: format === "cjs" ? ".js" : ".mjs",
  }),
});
