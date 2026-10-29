import { describe, expect, it } from "vitest";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { groupItemsByMonster } from "./group-items-by-monster";

const source = (name: string, type: string) => ({
  key: `pl_template_${name}`,
  id: 1,
  name,
  lvl: 100,
  icon: null,
  type,
});

const item = (
  id: number,
  droppedBy: ReturnType<typeof source>[],
): CatalogItemDtoOutput => ({
  id,
  name: `Item ${id}`,
  icon: "",
  stat: "",
  lvl: 100,
  rarity: "HEROIC",
  type: null,
  droppedBy,
});

const names = (groups: ReturnType<typeof groupItemsByMonster>) =>
  groups.map(({ monster, items }) => [
    monster?.name,
    items.map(({ id }) => id),
  ]);

describe("groupItemsByMonster", () => {
  it("lists an item under every monster it drops from", () => {
    const shared = item(1, [
      source("Haakon", "COLOSSUS"),
      source("Haakon", "TITAN"),
    ]);

    expect(names(groupItemsByMonster([shared, item(2, [])]))).toEqual([
      ["Haakon", [1]],
      ["Haakon", [1]],
      [undefined, [2]],
    ]);
  });

  it("files an item under the boss it drops from, not an earlier minion", () => {
    const groups = groupItemsByMonster(
      [item(1, [source("Szkielet", "ELITE"), source("Negthotep", "HERO")])],
      ({ type }) => type === "HERO",
    );

    expect(names(groups)).toEqual([["Negthotep", [1]]]);
  });
});
