import { defineConfig } from "tsup";
export default defineConfig({
  entry: {
    index: "src/index.ts",
    main: "src/generated/main.ts",
    activity: "src/generated/activity.ts",
    battlelog: "src/generated/battlelog.ts",
    search: "src/generated/search.ts",
    realtime: "../client/src/realtime/index.ts",
  },
  format: ["esm"],
  target: "es2022",
  splitting: true,
  clean: true,
  sourcemap: true,
  noExternal: [/^@lootlog\//],
  dts: {
    resolve: [/^@lootlog\//],
    compilerOptions: {
      paths: {
        "@lootlog/client/*": ["../client/src/*"],
        "@lootlog/protocol/realtime": ["../protocol/src/realtime/protocol.ts"],
        "@lootlog/protocol/*": ["../protocol/src/*"],
        "@lootlog/schema/*": ["../schema/src/*"],
      },
    },
  },
});
