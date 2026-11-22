import type { GameEvent } from "@lootlog/margonem/game-events";
import { applyGameEvent } from "./apply-event";
import type { SandboxWorld } from "./world";

export function createSiGlobals(world: SandboxWorld) {
  return {
    g: {
      init: 5,
      npc: world.npcs,
      other: world.others,
      worldConfig: { getWorldName: () => world.world, getNpcResp: () => 1 },
    },
    hero: world.hero,
    map: world.map,
    successData(payload: string) {
      const event: GameEvent = JSON.parse(payload);

      applyGameEvent(world, event);
    },
  };
}
