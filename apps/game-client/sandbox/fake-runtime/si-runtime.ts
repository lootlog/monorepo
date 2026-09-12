import type { GameEvent } from "@lootlog/margonem/game-events";
import { applyGameEvent } from "./apply-event";
import type { SandboxWorld } from "./world";

// Legacy interface globals. g.npc, g.other, hero and map are the live objects
// the SI adapter reads directly.
export function createSiGlobals(world: SandboxWorld) {
  return {
    g: {
      init: 5,
      npc: world.npcs,
      other: world.others,
      worldConfig: { getWorldName: () => world.world },
    },
    hero: world.hero,
    map: world.map,
    // SI receives the raw response text, as window.successData does in game.
    successData(payload: string) {
      const event: GameEvent = JSON.parse(payload);

      applyGameEvent(world, event);
    },
  };
}
