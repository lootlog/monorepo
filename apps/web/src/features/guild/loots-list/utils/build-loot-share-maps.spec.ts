import { describe, expect, it } from "vitest";
import { buildLootItemOwnerMap } from "./build-loot-share-maps";

describe("buildLootItemOwnerMap", () => {
  it("maps shared item ids to their owning player", () => {
    expect(
      buildLootItemOwnerMap({
        "player-1": ["item-1", "item-2"],
        "player-2": ["item-3"],
      }),
    ).toEqual({
      "item-1": "player-1",
      "item-2": "player-1",
      "item-3": "player-2",
    });
  });

  it("keeps missing share data as an empty owner map", () => {
    expect(buildLootItemOwnerMap(undefined)).toEqual({});
  });
});
