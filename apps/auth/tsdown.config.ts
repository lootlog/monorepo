import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["esm"],
  outExtensions: () => ({
    js: ".mjs",
  }),
});
