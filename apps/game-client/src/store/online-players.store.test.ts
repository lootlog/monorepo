import { beforeEach, describe, expect, it } from "vitest";
import {
  getCharacterFilterKey,
  getCharacterFilterScopeKey,
} from "@/lib/character-filter-scope";
import { useGameStore } from "@/store/game.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import {
  migrateOnlinePlayersState,
  ONLINE_PLAYERS_STORAGE_KEY,
  useOnlinePlayersStore,
} from "./online-players.store";

const warriorFilters = {
  minLvl: 100,
  maxLvl: 200,
  selectedProfession: "w",
} as const;

const hunterFilters = {
  minLvl: 0,
  maxLvl: 90,
  selectedProfession: "h",
} as const;

const characterScope = (
  characterId = "10",
  accountId = "202",
  world = "luvia",
  viewedWorld = world,
) => {
  setTestRuntimeGame({ hero: { characterId, accountId }, world });

  const scope = getCharacterFilterScopeKey(
    useGameStore.getState().game,
    viewedWorld,
  );

  if (!scope) throw new Error("Expected a ready character scope");

  return scope;
};

beforeEach(() => {
  useOnlinePlayersStore.setState(useOnlinePlayersStore.getInitialState(), true);
});

describe("online players filter persistence", () => {
  it("migrates all legacy guild filters once and retains them after reload", async () => {
    const storageName = ONLINE_PLAYERS_STORAGE_KEY;
    localStorage.setItem(
      storageName,
      JSON.stringify({
        version: 1,
        state: {
          viewMode: "members",
          filtersVisible: false,
          filtersByGuildId: {
            "guild-1": warriorFilters,
            "guild-2": hunterFilters,
          },
        },
      }),
    );
    await useOnlinePlayersStore.persist.rehydrate();
    const firstScope = characterScope();
    useOnlinePlayersStore.getState().initializeCharacterFilters(firstScope);
    const saved = localStorage.getItem(storageName);
    useOnlinePlayersStore.setState(
      useOnlinePlayersStore.getInitialState(),
      true,
    );

    if (saved) localStorage.setItem(storageName, saved);
    await useOnlinePlayersStore.persist.rehydrate();
    const secondScope = characterScope("20");
    useOnlinePlayersStore.getState().initializeCharacterFilters(secondScope);

    expect(useOnlinePlayersStore.getState()).toMatchObject({
      viewMode: "members",
      filtersVisible: false,
      legacyFiltersByGuildId: {},
      filtersByScope: {
        [getCharacterFilterKey(firstScope, "guild-1")]: warriorFilters,
        [getCharacterFilterKey(firstScope, "guild-2")]: hunterFilters,
      },
    });
    expect(
      useOnlinePlayersStore.getState().filtersByScope[
        getCharacterFilterKey(secondScope, "guild-2")
      ],
    ).toBeUndefined();
  });

  it("keeps character, account, game world, viewed world and guild filters isolated after reload", async () => {
    const firstScope = characterScope();

    const otherScopes = [
      characterScope("20"),
      characterScope("10", "303"),
      characterScope("10", "202", "fobos", "luvia"),
      characterScope("10", "202", "luvia", "fobos"),
    ];

    const store = useOnlinePlayersStore.getState();
    store.setFilters(firstScope, "guild-1", warriorFilters);
    store.setFilters(firstScope, "guild-2", hunterFilters);

    for (const scope of otherScopes)
      store.setFilters(scope, "guild-1", hunterFilters);

    const storageName = ONLINE_PLAYERS_STORAGE_KEY;
    const saved = localStorage.getItem(storageName);
    useOnlinePlayersStore.setState(
      useOnlinePlayersStore.getInitialState(),
      true,
    );

    if (saved) localStorage.setItem(storageName, saved);
    await useOnlinePlayersStore.persist.rehydrate();

    expect(
      useOnlinePlayersStore.getState().filtersByScope[
        getCharacterFilterKey(firstScope, "guild-1")
      ],
    ).toEqual(warriorFilters);
    expect(
      useOnlinePlayersStore.getState().filtersByScope[
        getCharacterFilterKey(firstScope, "guild-2")
      ],
    ).toEqual(hunterFilters);

    for (const scope of otherScopes) {
      expect(
        useOnlinePlayersStore.getState().filtersByScope[
          getCharacterFilterKey(scope, "guild-1")
        ],
      ).toEqual(hunterFilters);
    }
  });

  it("preserves new scoped preferences when legacy filters are still pending", () => {
    const scope = characterScope();
    useOnlinePlayersStore.setState({
      legacyFiltersByGuildId: { "guild-1": hunterFilters },
      filtersByScope: {
        [getCharacterFilterKey(scope, "guild-1")]: warriorFilters,
      },
    });
    useOnlinePlayersStore.getState().initializeCharacterFilters(scope);

    expect(
      useOnlinePlayersStore.getState().filtersByScope[
        getCharacterFilterKey(scope, "guild-1")
      ],
    ).toEqual(warriorFilters);
    expect(useOnlinePlayersStore.getState().legacyFiltersByGuildId).toEqual({});
  });

  it("drops invalid legacy filter records without discarding valid preferences", () => {
    expect(
      migrateOnlinePlayersState({
        viewMode: "members",
        filtersVisible: false,
        filtersByGuildId: {
          valid: warriorFilters,
          invalid: { ...hunterFilters, selectedProfession: "invalid" },
        },
      }),
    ).toEqual({
      viewMode: "members",
      filtersVisible: false,
      filtersByScope: {},
      legacyFiltersByGuildId: { valid: warriorFilters },
    });
  });
});
