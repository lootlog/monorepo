import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { LootDetailResponse, LootResponse, LootsQuery } from "./schemas.js";

const loot = {
  id: 1,
  uniqueId: "loot-1",
  world: "test",
  source: "FIGHT",
  location: "Map",
  items: [],
  players: [],
  mapPlayersSnapshot: null,
  npcs: [],
  lootShare: {},
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  commentsCount: 0,
} satisfies typeof LootResponse.Type;

describe("loot contracts", () => {
  it("preserves nullable detail metadata while stripping extra list fields", () => {
    const withMetadata = { ...loot, metadata: { revision: 2 } };
    expect(Schema.decodeUnknownSync(LootDetailResponse)(withMetadata)).toEqual(
      withMetadata,
    );
    expect(Schema.decodeUnknownSync(LootResponse)(withMetadata)).toEqual(loot);
    expect(Schema.decodeUnknownSync(LootDetailResponse)(null)).toBeNull();
  });

  it("preserves numeric filter bounds and does not coerce input strings", () => {
    const query = {
      limit: 100,
      cursor: -Number.MAX_SAFE_INTEGER,
      npcLevelMin: 0,
      itemLevelMax: 500,
    };
    expect(Schema.decodeUnknownSync(LootsQuery)(query)).toEqual(query);
    for (const invalid of [
      { limit: 101 },
      { npcLevelMin: -1 },
      { itemLevelMax: 501 },
      { limit: "10" },
    ]) {
      expect(() => Schema.decodeUnknownSync(LootsQuery)(invalid)).toThrow();
    }
  });
});
