import { defineConfig } from "tsdown";

export default defineConfig({
  dts: true,
  entry: {
    api: "src/api.ts",
    "change-player": "src/change-player.ts",
    "chat-controller": "src/chat-controller.ts",
    communication: "src/communication.ts",
    engine: "src/engine.ts",
    game: "src/game.ts",
    "game-events/index": "src/game-events/index.ts",
    hero: "src/hero.ts",
    "iframe-window-manager": "src/iframe-window-manager.ts",
    interface: "src/interface.ts",
    map: "src/map.ts",
    "npc-icon-manager": "src/npc-icon-manager.ts",
    "npc-tpl-manager": "src/npc-tpl-manager.ts",
    npcs: "src/npcs.ts",
    others: "src/others.ts",
    "server-storage": "src/server-storage.ts",
    "show-eq-manager": "src/show-eq-manager.ts",
    tooltip: "src/tooltip.ts",
    "widget-manager": "src/widget-manager.ts",
    "world-config": "src/world-config.ts",
  },
  format: ["esm", "cjs"],
  outExtensions: ({ format }) => ({
    js: format === "cjs" ? ".js" : ".mjs",
  }),
});
