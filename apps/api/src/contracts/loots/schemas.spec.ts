import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import {
  CreateLootCommentRequest,
  LootDetailResponse,
  LootResponse,
  LootsQuery,
  LootStatsQuery,
} from "./schemas.js";

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
      cursor: "eyJpZCI6MX0",
      npcLevelMin: 0,
      npcLevelMax: 0,
      itemLevelMax: 500,
    };

    expect(Schema.decodeUnknownSync(LootsQuery)(query)).toEqual(query);

    for (const invalid of [
      { limit: 101 },
      { npcLevelMin: -1 },
      { itemLevelMax: 501 },
      { limit: "10" },
      { cursor: 2 },
      { npcLevelMin: 10, npcLevelMax: 9 },
      { itemLevelMin: 10, itemLevelMax: 9 },
      { playerLevelMin: 10, playerLevelMax: 9 },
    ]) {
      expect(() => Schema.decodeUnknownSync(LootsQuery)(invalid)).toThrow();
    }
  });

  // An unknown value used to reach the enum column and fail the query with a 500.
  it("rejects unknown NPC types and rarities while decoding filters", () => {
    expect(
      Schema.decodeUnknownSync(LootsQuery)({ npcTypes: ["HERO", "TITAN"] }),
    ).toEqual({ npcTypes: ["HERO", "TITAN"] });

    for (const invalid of [{ npcTypes: ["DRAGON"] }, { rarities: ["EPIC"] }]) {
      expect(() => Schema.decodeUnknownSync(LootsQuery)(invalid)).toThrow();
    }

    expect(() =>
      Schema.decodeUnknownSync(LootStatsQuery)({ npcTypes: ["HERO,DRAGON"] }),
    ).toThrow();
  });

  it("stores a trimmed comment and rejects a blank or overlong one", () => {
    expect(
      Schema.decodeUnknownSync(CreateLootCommentRequest)({ content: "  gg  " }),
    ).toEqual({ content: "gg" });

    for (const content of ["   ", "x".repeat(257)]) {
      expect(() =>
        Schema.decodeUnknownSync(CreateLootCommentRequest)({ content }),
      ).toThrow();
    }
  });
});
