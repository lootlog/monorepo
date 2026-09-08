import type { HeroKill } from "@/features/guild/events/hooks/queries/use-hero-kill-history";

export function createHeroKill({
  isManualClose = false,
}: {
  isManualClose?: boolean;
} = {}): HeroKill {
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
    points: [1, 2].map((id) => ({
      id: `point-${id}`,
      memberId: id,
      points: 1,
      basePoints: 1,
      trackingDurationSeconds: null,
      trackingDurationPercentage: null,
      timeOnMapSeconds: 0,
      afkPercentage: 0,
      wasPresent: true,
      member: { id, name: `Member ${id}`, avatar: null, userId: `user-${id}` },
    })),
  };
}
