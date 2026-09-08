import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  dts: {
    only: true,
    resolve: [/^@lootlog\//],
    compilerOptions: {
      paths: { "@lootlog/schema/npc-type": ["../schema/src/npc-type.ts"] },
    },
  },
});
