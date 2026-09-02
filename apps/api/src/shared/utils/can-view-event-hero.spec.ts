import { Permission } from "@lootlog/schema/permissions";
import { filterHeroesByLevel } from "./can-view-event-hero.js";

type Role = Parameters<typeof filterHeroesByLevel>[1][number];

function createRole(
  _permissions: Permission[],
  lvlRangeFrom = 1,
  lvlRangeTo = 500,
): Role {
  return {
    lvlRangeFrom,
    lvlRangeTo,
  };
}

describe("filterHeroesByLevel", () => {
  it("allows administrative users to see all heroes", () => {
    const heroes = [{ npcLvl: 50 }, { npcLvl: 300 }];

    expect(filterHeroesByLevel(heroes, [], [Permission.ADMIN])).toEqual(heroes);
  });

  it("keeps heroes with unknown level visible", () => {
    const heroes = [{ npcLvl: null }, { npcLvl: 0 }];

    expect(
      filterHeroesByLevel(
        heroes,
        [createRole([])],
        [Permission.LOOTLOG_EVENTS_READ],
      ),
    ).toEqual(heroes);
  });

  it("filters heroes by role level range for regular users", () => {
    const heroes = [{ npcLvl: 120 }, { npcLvl: 320 }];

    expect(
      filterHeroesByLevel(
        heroes,
        [createRole([Permission.LOOTLOG_EVENTS_READ], 100, 200)],
        [Permission.LOOTLOG_EVENTS_READ],
      ),
    ).toEqual([{ npcLvl: 120 }]);
  });

  it("hides heroes when no role matches the level", () => {
    expect(
      filterHeroesByLevel(
        [{ npcLvl: 320 }],
        [createRole([Permission.LOOTLOG_EVENTS_READ], 100, 200)],
        [Permission.LOOTLOG_EVENTS_READ],
      ),
    ).toEqual([]);
  });
});
