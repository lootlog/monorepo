import type { UserFeedResponseDtoOutput } from "@lootlog/client/main";

export const feedKill = {
  id: "kill:organization:world:npc:minute",
  type: "kill",
  occurredAt: "2026-09-06T12:00:00Z",
  world: "pandora",
  guild: { id: "organization", name: "Organizacja", vanityUrl: null },
  npc: { id: 1, name: "Heros", type: "HERO", lvl: 100, icon: null },
  count: 1,
  version: 1,
} satisfies UserFeedResponseDtoOutput["items"][number];
export function feedResponse(count = 1): UserFeedResponseDtoOutput {
  return {
    generatedAt: "2026-09-06T12:00:00Z",
    windowStart: "2026-09-05T12:00:00Z",
    items: [{ ...feedKill, count, version: count }],
  };
}
