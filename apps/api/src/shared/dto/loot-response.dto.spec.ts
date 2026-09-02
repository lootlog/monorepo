import * as z from "zod";
import { LootResponseDto } from "./loot-response.dto.js";

describe("LootResponseDto", () => {
  it("decodes and encodes the persisted loot wire shape", () => {
    const wire = {
      id: 1,
      uniqueId: "loot-1",
      world: "Aether",
      source: "FIGHT" as const,
      location: "Ithan",
      items: [
        {
          id: 11,
          hid: "item-11",
          name: "Miecz",
          icon: "miecz.gif",
          stat: "lvl=10",
          type: "ONE_HAND_WEAPON",
          rarity: "LEGENDARY" as const,
          lvl: 10,
          prof: ["WARRIOR" as const],
        },
      ],
      players: [
        {
          id: "player-1",
          name: "Gracz",
          lvl: 100,
          prof: "WARRIOR" as const,
          icon: "warrior.gif",
          characterId: 123,
          accountId: 456,
          hpp: 100,
        },
      ],
      npcs: [
        {
          id: 7,
          name: "Heros",
          wt: 80,
          lvl: 120,
          prof: null,
          icon: "hero.gif",
          type: "HERO" as const,
          margonemType: 4,
        },
      ],
      lootShare: { "player-1": ["item-11"] },
      createdAt: "2026-09-02T00:00:00.000Z",
      updatedAt: "2026-09-02T00:01:00.000Z",
      submissions: [],
      commentsCount: 0,
    };

    const decoded = z.decode(LootResponseDto.schema, wire);

    expect(decoded.createdAt).toEqual(new Date(wire.createdAt));
    expect(decoded.updatedAt).toEqual(new Date(wire.updatedAt));
    expect(z.encode(LootResponseDto.schema, decoded)).toEqual(wire);
  });

  it("rejects unknown persisted enum values", () => {
    expect(
      LootResponseDto.schema.safeParse({
        id: 1,
        uniqueId: "loot-1",
        world: "Aether",
        source: "MANUAL",
        location: "Ithan",
        items: [],
        players: [],
        npcs: [],
        lootShare: {},
        createdAt: "2026-09-02T00:00:00.000Z",
        updatedAt: "2026-09-02T00:00:00.000Z",
        commentsCount: 0,
      }).success,
    ).toBe(false);
  });
});
