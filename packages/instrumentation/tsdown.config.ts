import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    "instrumentation-nest": "src/instrumentation-nest.ts",
  },
  format: ["esm", "cjs"],
  outExtensions: ({ format }) => ({
    js: format === "cjs" ? ".cjs" : ".mjs",
  }),
});
