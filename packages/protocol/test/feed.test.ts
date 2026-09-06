import { expect, test } from "bun:test";
import { Schema } from "effect";
import { UserFeedItem } from "../src/feed.js";

test("accepts queued feed previews from before item statistics and grouping were added", () => {
  const preview = {
    id: "loot:1",
    version: 1,
    occurredAt: "2026-09-06T12:00:00.000Z",
    world: "tempest",
    guild: { id: "organization", name: "Organization", vanityUrl: null },
    npc: null,
    type: "loot",
    lootId: 1,
    additionalItemsCount: 0,
    items: [{ id: 1, name: "Item", icon: "item.png", rarity: null }],
  };
  const decode = Schema.decodeUnknownSync(UserFeedItem);
  expect(decode(preview)).toEqual(preview);
  const enriched = {
    ...preview,
    groupKey: "loot:1",
    summary: {
      items: [
        {
          ...preview.items[0],
          hid: "hid",
          stat: "lvl=100;sa=10",
          type: null,
          lvl: 100,
          prof: ["WARRIOR"],
        },
      ],
      players: [
        {
          id: "21",
          name: "Participant",
          lvl: 100,
          prof: "WARRIOR",
          icon: null,
          characterId: 2,
          accountId: 1,
          hpp: 75,
        },
      ],
      npcs: [],
      location: "map",
      lootShare: { Participant: ["1"] },
    },
    items: [
      { ...preview.items[0], stat: "lvl=100;sa=10", type: null, lvl: 100 },
    ],
  };
  expect(decode(enriched)).toEqual(enriched);
  expect(() =>
    decode({ ...enriched, items: [{ ...enriched.items[0], stat: 10 }] }),
  ).toThrow();
});

test("keeps old kill messages valid while carrying optional NPC profession", () => {
  const event = {
    id: "kill:organization:tempest:1:202609061200",
    version: 1,
    occurredAt: "2026-09-06T12:00:00.000Z",
    world: "tempest",
    guild: { id: "organization", name: "Organization", vanityUrl: null },
    type: "kill",
    count: 1,
    npc: { id: 1, name: "NPC", type: "HERO", lvl: 100, icon: null },
  };
  const decode = Schema.decodeUnknownSync(UserFeedItem);
  expect(decode(event)).toEqual(event);
  for (const prof of ["w", "WARRIOR", null]) {
    const withProfession = { ...event, npc: { ...event.npc, prof } };
    expect(decode(withProfession)).toEqual(withProfession);
  }
  expect(() => decode({ ...event, npc: { ...event.npc, prof: 1 } })).toThrow();
});
