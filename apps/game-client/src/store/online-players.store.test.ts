import { describe, expect, it } from "vitest";
import {
  migrateOnlinePlayersState,
  useOnlinePlayersStore,
} from "./online-players.store";

describe("migrateOnlinePlayersState", () => {
  it("adds defaults for missing online players feature state", () => {
    expect(migrateOnlinePlayersState({})).toEqual({
      viewMode: "accounts",
      filtersVisible: true,
      filtersByGuildId: {},
    });
  });

  it("keeps valid persisted online players feature state", () => {
    expect(
      migrateOnlinePlayersState({
        viewMode: "members",
        filtersVisible: false,
        filtersByGuildId: {
          "guild-1": {
            minLvl: 100,
            maxLvl: 200,
            selectedProfession: "w",
          },
        },
      }),
    ).toEqual({
      viewMode: "members",
      filtersVisible: false,
      filtersByGuildId: {
        "guild-1": {
          minLvl: 100,
          maxLvl: 200,
          selectedProfession: "w",
        },
      },
    });
  });

  it("drops invalid persisted online players filters by guild", () => {
    expect(
      migrateOnlinePlayersState({
        viewMode: "members",
        filtersVisible: false,
        filtersByGuildId: {
          "guild-1": {
            minLvl: 100,
            maxLvl: 200,
            selectedProfession: "invalid",
          },
        },
      }),
    ).toEqual({
      viewMode: "members",
      filtersVisible: false,
      filtersByGuildId: {},
    });
  });
});

describe("useOnlinePlayersStore", () => {
  it("stores filters separately for each guild", () => {
    useOnlinePlayersStore.setState({
      viewMode: "accounts",
      filtersVisible: true,
      filtersByGuildId: {},
    });

    useOnlinePlayersStore.getState().setFilters("guild-1", {
      minLvl: 100,
      maxLvl: 500,
      selectedProfession: "all",
    });
    useOnlinePlayersStore.getState().setFilters("guild-2", {
      minLvl: 0,
      maxLvl: 90,
      selectedProfession: "h",
    });

    expect(useOnlinePlayersStore.getState().filtersByGuildId).toEqual({
      "guild-1": {
        minLvl: 100,
        maxLvl: 500,
        selectedProfession: "all",
      },
      "guild-2": {
        minLvl: 0,
        maxLvl: 90,
        selectedProfession: "h",
      },
    });
  });
});
