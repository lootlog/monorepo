import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  fixedExtension: false,
  deps: { alwaysBundle: [/^@lootlog\//] },
  dts: {
    emitDtsOnly: true,
    tsconfig: "../tsconfig.public-api.json",
  },
});
