import { describe, expect, it } from "vitest";
import type { Loot } from "@/lib/loots/loot-types";
import {
  buildLootItemOwnerMap,
  buildLootPlayerColorMap,
  buildLootShareMaps,
} from "./build-loot-share-maps";

describe("buildLootShareMaps", () => {
  const players = [{ id: "player-1" }, { id: "player-2" }] as Loot["players"];

  it("assigns stable player colors by display order", () => {
    expect(buildLootPlayerColorMap(players)).toEqual({
      "player-1": { color: "#e6194b", idx: 0 },
      "player-2": { color: "#3cb44b", idx: 1 },
    });
  });

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

  it("builds color and owner maps together", () => {
    const loot = {
      players,
      lootShare: {
        "player-1": ["item-1"],
      },
    } as Pick<Loot, "players" | "lootShare">;

    expect(buildLootShareMaps(loot)).toEqual({
      playerColorMap: {
        "player-1": { color: "#e6194b", idx: 0 },
        "player-2": { color: "#3cb44b", idx: 1 },
      },
      itemOwnerMap: {
        "item-1": "player-1",
      },
    });
  });
});
