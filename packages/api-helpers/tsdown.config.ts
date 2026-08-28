import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    "auth/verify-jwt": "src/lib/auth/utils/verify-jwt.ts",
    permissions: "src/lib/permissions/can-view-npc-timer.ts",
  },
  dts: true,
  format: ["esm", "cjs"],
  outExtensions: ({ format }) => ({
    js: format === "cjs" ? ".js" : ".mjs",
  }),
});
