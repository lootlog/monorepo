import type { CreateKillRequest } from "#src/contracts/kills/schemas";

export const payload = {
  world: "tempest",
  accountId: "account-1",
  characterId: "character-1",
  npc: { id: 123, name: "Mushita", lvl: 100, wt: 80 },
} satisfies CreateKillRequest;
