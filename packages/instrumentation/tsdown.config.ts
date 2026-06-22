import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    "instrumentation-nest": "src/instrumentation-nest.ts",
    "instrumentation-hono": "src/instrumentation-hono.ts",
  },
  format: ["esm", "cjs"],
  outExtensions: ({ format }) => ({
    js: format === "cjs" ? ".cjs" : ".mjs",
  }),
});
