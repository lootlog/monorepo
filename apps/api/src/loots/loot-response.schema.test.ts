import { describe, expect, it } from "#test/bun-test";
import { Schema } from "effect";
import { LootResponse } from "#src/loots/loot-response.schema";

describe("LootResponse", () => {
  it("round-trips nested loot data and dates", () => {
    const wire = {
      id: 1,
      uniqueId: "loot-1",
      world: "Tempest",
      source: "FIGHT",
      location: "map",
      items: [],
      players: [],
      npcs: [],
      lootShare: {},
      createdAt: "2026-09-03T00:00:00.000Z",
      updatedAt: "2026-09-03T00:01:00.000Z",
      commentsCount: 0,
    } as const;
    const decoded = Schema.decodeUnknownSync(LootResponse)(wire);
    expect(decoded.createdAt).toBeInstanceOf(Date);
    expect(Schema.encodeSync(LootResponse)(decoded)).toEqual(wire);
  });
});
