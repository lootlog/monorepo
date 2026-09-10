import type { Loot } from "@/lib/loots/loot-types";

export function createLoot(id = 1): Loot {
  return {
    id,
    uniqueId: `loot-${id}`,
    mapPlayersSnapshot: null,
    world: "tempest",
    source: "FIGHT",
    location: "Starorzecze Narumi",
    items: [
      {
        id: 1,
        hid: "item-1",
        name: "Legendarny przedmiot",
        icon: "item.png",
        stat: "",
        type: null,
        rarity: "LEGENDARY",
        lvl: 284,
        prof: [],
      },
    ],
    players: [
      {
        id: "player-1",
        name: "Tester",
        lvl: 284,
        prof: null,
        icon: null,
        characterId: null,
        accountId: null,
        hpp: null,
      },
    ],
    npcs: [
      {
        id: 1,
        name: "Potulny Berserker",
        wt: 284,
        lvl: 284,
        prof: null,
        icon: null,
        type: null,
        margonemType: null,
      },
    ],
    lootShare: { "player-1": ["item-1"] },
    createdAt: "2026-08-12T10:54:00.000Z",
    updatedAt: "2026-08-12T10:54:00.000Z",
    commentsCount: 0,
  };
}
