import { seedRuntimeOthers } from "@/test/runtime-other-fixtures";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Other } from "@lootlog/margonem/others";
import {
  LOOTLOG_OTHER_GLOW_BLUE,
  LOOTLOG_OTHER_GLOW_RED_ORANGE,
  LOOTLOG_OTHER_GLOW_UNKNOWN,
  lootlogOtherGlowManager,
} from "@/lib/margonem-runtime/adapters/glow-runtime-adapter";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useOthersStore } from "@/store/others.store";
import { useSettingsStore } from "@/store/settings.store";
import { useGlobalStore } from "@/store/global.store";
import { useGameStore } from "@/store/game.store";
import { testRuntimeWindow } from "@/test/test-runtime-window";

import { createCatchingGuildsHttp } from "@/test/catching-guilds-http";
import {
  createGuildPreferencesTest,
  createTestGuild,
} from "@/test/guild-preferences-test";

let endpoint: ReturnType<typeof createCatchingGuildsHttp>;

let test: ReturnType<typeof createGuildPreferencesTest>;

function setAccessibleGuilds(
  guilds: { id: string; name: string; icon: null }[],
) {
  test.queryClient.setQueryData(
    test.guildsKey,
    guilds.map(({ id, name }) => createTestGuild(id, name)),
  );
}

function renderGlowHook<Result>(callback: () => Result) {
  return renderHook(callback, { wrapper: test.wrapper });
}

import { useOtherCatchingGuildGlow } from "./use-other-catching-guild-glow";
import { useSelectedLootlogGuildInitialization } from "../use-selected-lootlog-guild";

const originalWindowEngine = testRuntimeWindow.Engine;

function createOther(id: string) {
  return {
    d: {
      account: 9822301,
      icon: "other.gif",
      id,
      lvl: 300,
      nick: `Other ${id}`,
      prof: "w",
      x: 10,
      y: 10,
    },
    fh: 48,
    fw: 32,
    rx: 10,
    ry: 10,
  };
}

function setOnlineOwners(others: Record<string, Other>): void {
  useOnlineCharacterOwnersStore.getState().setPresenceResponse({
    "player-discord": Object.values(others).map((other) => ({
      discordId: "player-discord",
      isAfk: false,
      player: {
        accountId: String(other.d.account),
        characterId: String(other.d.id),
        icon: other.d.icon,
        lvl: other.d.lvl,
        name: other.d.nick,
        prof: other.d.prof,
        world: "tempest",
      },
    })),
  });
}

function setRuntime(heroId: number | null | undefined = 101) {
  const engine = {
    hero: {
      d: {
        id: heroId,
      },
    },
    imgLoader: {
      onload: vi.fn<
        (
          path: string,
          options: boolean,
          before: (image: HTMLImageElement) => void,
          after: (image: HTMLImageElement) => void,
        ) => void
      >((_path, _options, beforeOnload, afterOnload) => {
        const image = document.createElement("img");
        beforeOnload(image);
        afterOnload(image);
      }),
    },
    map: {
      offset: [0, 0],
      water: {},
    },
    mapShift: {
      getShift: () => [0, 0],
    },
    others: {
      getDrawableList: vi.fn<() => Other[]>(() => []),
    },
  };

  Object.defineProperty(window, "Engine", {
    configurable: true,
    value: engine,
  });

  if (heroId === null || heroId === undefined) {
    useGameStore.getState().clearGame();

    return engine;
  }

  useGameStore.getState().replaceGame({
    hero: {
      accountId: "1",
      characterId: String(heroId),
      currentHp: 1,
      icon: "hero.gif",
      level: 300,
      maxHp: 1,
      name: "Hero",
      profession: "w",
      x: 1,
      y: 2,
    },
    interface: "ni",
    map: { id: 1, name: "Map", visibility: 30 },
    world: "tempest",
  });

  return engine;
}

describe("useOtherCatchingGuildGlow", () => {
  beforeEach(() => {
    test = createGuildPreferencesTest();
    endpoint = createCatchingGuildsHttp();
    setAccessibleGuilds([{ id: "guild-blue", name: "Blue Guild", icon: null }]);
    test.setPreferences({ guildsOrder: ["guild-blue"] });
    lootlogOtherGlowManager.cleanup();
    useCharacterTooltipCatchingGuildsStore.getState().clear();
    useOnlineCharacterOwnersStore.getState().clearOwners();
    useOthersStore.getState().clearOthers();
    useGlobalStore.setState({
      gameState: { gameInitialized: true },
    });
    useSettingsStore.setState({
      guildIdByCharId: {},
    });
    setRuntime();
  });

  afterEach(() => {
    lootlogOtherGlowManager.cleanup();
    Object.defineProperty(window, "Engine", {
      configurable: true,
      value: originalWindowEngine,
    });
  });

  it("uses the default guild on the first shift without a manual guild change", async () => {
    const other = createOther("1");
    setRuntime(undefined);
    setAccessibleGuilds([
      { id: "guild-red", name: "Red Guild", icon: null },
      { id: "guild-blue", name: "Blue Guild", icon: null },
    ]);
    seedRuntimeOthers({ "1": other });
    setOnlineOwners({ "1": other });
    endpoint.mockResolvedValue({
      players: [
        {
          userId: "player-discord",
          accountId: String(other.d.account),
          characterId: String(other.d.id),
          guilds: [{ id: "guild-blue", name: "Blue Guild" }],
        },
      ],
    });

    renderGlowHook(() => {
      useSelectedLootlogGuildInitialization();
      useOtherCatchingGuildGlow();
    });

    expect(useSettingsStore.getState().guildIdByCharId).not.toHaveProperty(
      "undefined",
    );

    const runtimeHero = testRuntimeWindow.Engine?.hero;

    if (!runtimeHero) throw new Error("Expected test runtime hero");
    runtimeHero.d.id = 101;
    act(() => {});

    await waitFor(() => {
      expect(useSettingsStore.getState().guildIdByCharId["101"]).toBe(
        "guild-blue",
      );
    });

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(endpoint).toHaveBeenCalledOnce();
      expect(lootlogOtherGlowManager.getGlowColor("1")).toBe(
        LOOTLOG_OTHER_GLOW_BLUE,
      );
    });
  });

  it("does not create a selection from a null character ID", () => {
    setRuntime(null);

    renderGlowHook(() => useSelectedLootlogGuildInitialization());

    expect(useSettingsStore.getState().guildIdByCharId).toEqual({});
  });

  it("uses API guild order when preferences finish without data", async () => {
    setAccessibleGuilds([
      { id: "guild-red", name: "Red Guild", icon: null },
      { id: "guild-blue", name: "Blue Guild", icon: null },
    ]);
    test.queryClient.removeQueries({ queryKey: test.preferencesKey });

    renderGlowHook(() => useSelectedLootlogGuildInitialization());

    await waitFor(() => {
      expect(useSettingsStore.getState().guildIdByCharId["101"]).toBe(
        "guild-red",
      );
    });
  });

  it("initializes a separate default after the current character changes", async () => {
    renderGlowHook(() => useSelectedLootlogGuildInitialization());

    await waitFor(() => {
      expect(useSettingsStore.getState().guildIdByCharId["101"]).toBe(
        "guild-blue",
      );
    });

    setRuntime(202);
    act(() => {});

    await waitFor(() => {
      expect(useSettingsStore.getState().guildIdByCharId).toEqual({
        "101": "guild-blue",
        "202": "guild-blue",
      });
    });
  });

  it("does one batch request for many others and colors successful entries by selected guild", async () => {
    const others = Object.fromEntries(
      Array.from({ length: 50 }, (_, index) => {
        const characterId = String(index + 1);

        return [characterId, createOther(characterId)];
      }),
    );

    seedRuntimeOthers(others);
    setOnlineOwners(others);
    useSettingsStore.setState({
      guildIdByCharId: {
        "101": "guild-blue",
      },
    });
    endpoint.mockResolvedValue({
      players: Object.values(others).map((other, index) => ({
        userId: "player-discord",
        accountId: String(other.d.account),
        characterId: String(other.d.id),
        guilds: index === 0 ? [{ id: "guild-blue", name: "Blue Guild" }] : [],
      })),
    });

    renderGlowHook(() => useOtherCatchingGuildGlow());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(endpoint).toHaveBeenCalledOnce();
    });
    expect(endpoint).toHaveBeenCalledWith(
      {
        players: Object.values(others).map((other) => ({
          userId: "player-discord",
          accountId: String(other.d.account),
          characterId: String(other.d.id),
        })),
      },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    await waitFor(() => {
      expect(lootlogOtherGlowManager.getGlowCount()).toBe(50);
    });
    expect(lootlogOtherGlowManager.getGlowColor("1")).toBe(
      LOOTLOG_OTHER_GLOW_BLUE,
    );
    expect(lootlogOtherGlowManager.getGlowColor("2")).toBe(
      LOOTLOG_OTHER_GLOW_RED_ORANGE,
    );
  });

  it("fetches missing targets in multiple batches when more than 100 others are visible", async () => {
    const others = Object.fromEntries(
      Array.from({ length: 125 }, (_, index) => {
        const characterId = String(index + 1);

        return [characterId, createOther(characterId)];
      }),
    );

    seedRuntimeOthers(others);
    setOnlineOwners(others);
    useSettingsStore.setState({
      guildIdByCharId: {
        "101": "guild-blue",
      },
    });
    endpoint.mockImplementation(({ players }) =>
      Promise.resolve({
        players: players.map((player) => ({
          userId: "player-discord",
          accountId: "9822301",
          characterId: player.characterId,
          guilds: [],
        })),
      }),
    );

    renderGlowHook(() => useOtherCatchingGuildGlow());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(endpoint).toHaveBeenCalledTimes(2);
    });
    expect(endpoint.mock.calls[0]?.[0].players).toHaveLength(100);
    expect(endpoint.mock.calls[1]?.[0].players).toHaveLength(25);
  });

  it("finishes every queued batch after an earlier batch error", async () => {
    const others = Object.fromEntries(
      Array.from({ length: 125 }, (_, index) => {
        const characterId = String(index + 1);

        return [characterId, createOther(characterId)];
      }),
    );

    seedRuntimeOthers(others);
    setOnlineOwners(others);
    useSettingsStore.setState({
      guildIdByCharId: {
        "101": "guild-blue",
      },
    });
    endpoint.mockRejectedValue(new Error("broken"));

    renderGlowHook(() => useOtherCatchingGuildGlow());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      // Native fetch failures become retryable ApiErrors: both batches make their one retry.
      expect(endpoint).toHaveBeenCalledTimes(4);
      expect(
        useCharacterTooltipCatchingGuildsStore.getState().entriesByKey[
          "9822301:125"
        ]?.status,
      ).toBe("error");
    });
  });

  it("does not request or glow without a selected timers guild", () => {
    seedRuntimeOthers({
      "1": createOther("1"),
    });
    setOnlineOwners({ "1": createOther("1") });

    renderGlowHook(() => useOtherCatchingGuildGlow());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    expect(endpoint).not.toHaveBeenCalled();
    expect(lootlogOtherGlowManager.getGlowCount()).toBe(0);
    expect(lootlogOtherGlowManager.getNativeGlowSuppressed()).toBe(false);
  });

  it("installs the NI drawable wrapper only while glow mode is active", () => {
    useSettingsStore.setState({
      guildIdByCharId: {
        "101": "guild-blue",
      },
    });
    const engineOthers = setRuntime().others;
    const originalGetDrawableList = engineOthers.getDrawableList;

    const { unmount } = renderGlowHook(() => useOtherCatchingGuildGlow());

    expect(engineOthers.getDrawableList).toBe(originalGetDrawableList);

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });
    expect(engineOthers.getDrawableList).not.toBe(originalGetDrawableList);

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(false);
    });
    expect(engineOthers.getDrawableList).toBe(originalGetDrawableList);
    unmount();
  });

  it("does not rerender for other or presence updates while inactive", () => {
    let renderCount = 0;

    const { unmount } = renderGlowHook(() => {
      renderCount += 1;
      useOtherCatchingGuildGlow();
    });

    const renderCountBeforeUpdates = renderCount;
    const other = createOther("1");

    act(() => {
      seedRuntimeOthers({ "1": other });
      setOnlineOwners({ "1": other });
    });

    expect(renderCount).toBe(renderCountBeforeUpdates);
    unmount();
  });

  it("does not run or suppress native glow when all Discords are selected", () => {
    const other = createOther("1");
    seedRuntimeOthers({ "1": other });
    setOnlineOwners({ "1": other });
    useSettingsStore.setState({
      guildIdByCharId: { "101": "all" },
    });

    renderGlowHook(() => useOtherCatchingGuildGlow());
    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    expect(endpoint).not.toHaveBeenCalled();
    expect(lootlogOtherGlowManager.getGlowCount()).toBe(0);
    expect(lootlogOtherGlowManager.getNativeGlowSuppressed()).toBe(false);
  });

  it("does not request when visible characters have no online owner", () => {
    seedRuntimeOthers({
      "1": createOther("1"),
    });
    useSettingsStore.setState({
      guildIdByCharId: {
        "101": "guild-blue",
      },
    });

    renderGlowHook(() => useOtherCatchingGuildGlow());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    expect(endpoint).not.toHaveBeenCalled();
    expect(lootlogOtherGlowManager.getGlowColor("1")).toBe(
      LOOTLOG_OTHER_GLOW_UNKNOWN,
    );
  });

  it("ignores flat runtime handles when shift activates glows", () => {
    seedRuntimeOthers({
      "1": {
        account: 9822301,
        id: "1",
        icon: "other.gif",
        lvl: 300,
        nick: "Other 1",
        prof: "w",
      },
    });
    useSettingsStore.setState({
      guildIdByCharId: {
        "101": "guild-blue",
      },
    });

    renderGlowHook(() => useOtherCatchingGuildGlow());

    expect(() => {
      act(() => {
        useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
      });
    }).not.toThrow();
    expect(lootlogOtherGlowManager.getGlowCount()).toBe(0);
  });

  it("requests visible characters when online owners become known after shift", async () => {
    const other = createOther("1");
    seedRuntimeOthers({
      "1": other,
    });
    useSettingsStore.setState({
      guildIdByCharId: {
        "101": "guild-blue",
      },
    });
    endpoint.mockResolvedValue({
      players: [
        {
          userId: "player-discord",
          accountId: String(other.d.account),
          characterId: String(other.d.id),
          guilds: [],
        },
      ],
    });

    renderGlowHook(() => useOtherCatchingGuildGlow());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    expect(endpoint).not.toHaveBeenCalled();

    act(() => {
      setOnlineOwners({ "1": other });
    });

    await waitFor(() => {
      expect(endpoint).toHaveBeenCalledWith(
        {
          players: [
            {
              userId: "player-discord",
              accountId: String(other.d.account),
              characterId: String(other.d.id),
            },
          ],
        },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });

  it("finishes an in-flight batch when another player appears", async () => {
    const firstOther = createOther("1");
    const secondOther = createOther("2");

    let resolveFirstBatch:
      | ((value: {
          players: Array<{
            accountId: string;
            characterId: string;
            guilds: Array<{ id: string; name: string }>;
            userId: string;
          }>;
        }) => void)
      | undefined;

    seedRuntimeOthers({ "1": firstOther });
    setOnlineOwners({ "1": firstOther, "2": secondOther });
    useSettingsStore.setState({
      guildIdByCharId: {
        "101": "guild-blue",
      },
    });
    endpoint
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstBatch = resolve;
          }),
      )
      .mockImplementationOnce(
        ({ players }: { players: Array<{ characterId: string }> }) =>
          Promise.resolve({
            players: players.map((player) => ({
              userId: "player-discord",
              accountId: "9822301",
              characterId: player.characterId,
              guilds: [],
            })),
          }),
      );

    renderGlowHook(() => useOtherCatchingGuildGlow());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(endpoint).toHaveBeenCalledOnce();
    });

    act(() => {
      seedRuntimeOthers({ "1": firstOther, "2": secondOther });
    });

    act(() => {
      resolveFirstBatch?.({
        players: [
          {
            userId: "player-discord",
            accountId: "9822301",
            characterId: "1",
            guilds: [{ id: "guild-blue", name: "Blue Guild" }],
          },
        ],
      });
    });

    await waitFor(() => {
      expect(endpoint).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(lootlogOtherGlowManager.getGlowCount()).toBe(2);
    });
    expect(lootlogOtherGlowManager.getGlowColor("1")).toBe(
      LOOTLOG_OTHER_GLOW_BLUE,
    );
    expect(lootlogOtherGlowManager.getGlowColor("2")).toBe(
      LOOTLOG_OTHER_GLOW_RED_ORANGE,
    );
  });

  it("clears glows when shift is released", async () => {
    const other = createOther("1");
    seedRuntimeOthers({ "1": other });
    setOnlineOwners({ "1": other });
    useSettingsStore.setState({
      guildIdByCharId: {
        "101": "guild-blue",
      },
    });
    endpoint.mockResolvedValue({
      players: [
        {
          userId: "player-discord",
          accountId: String(other.d.account),
          characterId: String(other.d.id),
          guilds: [{ id: "guild-blue", name: "Blue Guild" }],
        },
      ],
    });

    renderGlowHook(() => useOtherCatchingGuildGlow());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    expect(lootlogOtherGlowManager.getNativeGlowSuppressed()).toBe(true);

    await waitFor(() => {
      expect(lootlogOtherGlowManager.getGlowCount()).toBe(1);
    });

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(false);
    });

    expect(lootlogOtherGlowManager.getGlowCount()).toBe(0);
    expect(lootlogOtherGlowManager.getNativeGlowSuppressed()).toBe(false);
  });
});
