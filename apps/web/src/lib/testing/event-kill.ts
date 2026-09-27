import type { KillHistoryEntry } from "@lootlog/client/main";

export function createHeroKill({
  isManualClose = false,
}: {
  isManualClose?: boolean;
} = {}): KillHistoryEntry {
  return {
    heroNpc: {
      id: "hero-1",
      npcIcon: "zorin.gif",
      npcId: 123,
      npcLvl: 100,
      npcName: "Zorin",
    },
    heroNpcId: "hero-1",
    id: "kill-1",
    isManualClose,
    killedAt: "2026-07-31T01:15:00.000Z",
    maxSpawnTimeAtKill: "2026-07-31T02:00:00.000Z",
    minSpawnTimeAtKill: "2026-07-31T01:00:00.000Z",
    participantCount: 2,
  };
}
