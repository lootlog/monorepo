import { fileURLToPath } from "node:url";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    main: "src/generated/main.ts",
    activity: "src/generated/activity.ts",
    battlelog: "src/generated/battlelog.ts",
    search: "src/generated/search.ts",
    catalog: "src/generated/catalog.ts",
    realtime: fileURLToPath(import.meta.resolve("@lootlog/client/realtime")),
  },
  format: ["esm"],
  target: "es2022",
  clean: true,
  fixedExtension: false,
  sourcemap: true,
  deps: { alwaysBundle: [/^@lootlog\//] },
  dts: {
    tsconfig: "../tsconfig.public-api.json",
  },
});
