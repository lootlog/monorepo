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

const mocks = vi.hoisted(() => ({
  afterGameEventHandler: undefined as (() => void) | undefined,
  getAccessibleGuilds: vi.fn(),
  getPlayersCatchingGuilds: vi.fn(),
  getUserPreferences: vi.fn(),
}));

vi.mock("@lootlog/api-client/react-query/main/user-lootlog-config", () => ({
  userLootlogConfigControllerGetPlayersCatchingGuilds:
    mocks.getPlayersCatchingGuilds,
}));

vi.mock("@lootlog/api-client/react-query/main/users", () => ({
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey: () => [
    "accessible-guilds",
  ],
  useUsersControllerGetCurrentUserAccessibleGuilds: () =>
    mocks.getAccessibleGuilds(),
}));

vi.mock("@/hooks/api/use-user-preferences", () => ({
  useUserPreferences: () => mocks.getUserPreferences(),
}));

vi.mock("@/lib/game-events-manager", () => ({
  gameEventsManager: {
    subscribeAfterGameEvent: (handler: () => void) => {
      mocks.afterGameEventHandler = handler;
      return () => {
        if (mocks.afterGameEventHandler === handler) {
          mocks.afterGameEventHandler = undefined;
        }
      };
    },
  },
}));

import { useOtherCatchingGuildGlow } from "./use-other-catching-guild-glow";
import { useSelectedLootlogGuildInitialization } from "../use-selected-lootlog-guild";

const originalWindowEngine = testRuntimeWindow.Engine;

function createOther(id: string): Other {
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
  } as unknown as Other;
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

function setRuntime(heroId: number | null | undefined = 101): void {
  Object.defineProperty(window, "Engine", {
    configurable: true,
    value: {
      hero: {
        d: {
          id: heroId,
        },
      },
      imgLoader: {
        onload: vi.fn((_path, _options, beforeOnload, afterOnload) => {
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
        getDrawableList: vi.fn(() => []),
      },
    },
  });
  if (heroId === null || heroId === undefined) {
    useGameStore.getState().clearGame();
    return;
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
}

describe("useOtherCatchingGuildGlow", () => {
  beforeEach(() => {
    mocks.afterGameEventHandler = undefined;
    mocks.getAccessibleGuilds.mockReset();
    mocks.getPlayersCatchingGuilds.mockReset();
    mocks.getUserPreferences.mockReset();
    mocks.getAccessibleGuilds.mockReturnValue({
      data: [{ id: "guild-blue", name: "Blue Guild", icon: null }],
      isFetched: true,
    });
    mocks.getUserPreferences.mockReturnValue({
      data: { guildsOrder: ["guild-blue"] },
      isFetched: true,
    });
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
    mocks.getAccessibleGuilds.mockReturnValue({
      data: [
        { id: "guild-red", name: "Red Guild", icon: null },
        { id: "guild-blue", name: "Blue Guild", icon: null },
      ],
      isFetched: true,
    });
    useOthersStore.getState().setMany({ "1": other });
    setOnlineOwners({ "1": other });
    mocks.getPlayersCatchingGuilds.mockResolvedValue({
      players: [
        {
          userId: "player-discord",
          accountId: String(other.d.account),
          characterId: String(other.d.id),
          guilds: [{ id: "guild-blue", name: "Blue Guild" }],
        },
      ],
    });

    renderHook(() => {
      useSelectedLootlogGuildInitialization();
      useOtherCatchingGuildGlow();
    });

    expect(useSettingsStore.getState().guildIdByCharId).not.toHaveProperty(
      "undefined",
    );

    const runtimeHero = testRuntimeWindow.Engine?.hero;
    if (!runtimeHero) throw new Error("Expected test runtime hero");
    runtimeHero.d.id = 101;
    act(() => {
      mocks.afterGameEventHandler?.();
    });

    await waitFor(() => {
      expect(useSettingsStore.getState().guildIdByCharId["101"]).toBe(
        "guild-blue",
      );
    });

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(mocks.getPlayersCatchingGuilds).toHaveBeenCalledOnce();
      expect(lootlogOtherGlowManager.getGlowColor("1")).toBe(
        LOOTLOG_OTHER_GLOW_BLUE,
      );
    });
  });

  it("does not create a selection from a null character ID", () => {
    setRuntime(null);

    renderHook(() => useSelectedLootlogGuildInitialization());

    expect(useSettingsStore.getState().guildIdByCharId).toEqual({});
  });

  it("uses API guild order when preferences finish without data", async () => {
    mocks.getAccessibleGuilds.mockReturnValue({
      data: [
        { id: "guild-red", name: "Red Guild", icon: null },
        { id: "guild-blue", name: "Blue Guild", icon: null },
      ],
      isFetched: true,
    });
    mocks.getUserPreferences.mockReturnValue({
      data: undefined,
      isFetched: true,
    });

    renderHook(() => useSelectedLootlogGuildInitialization());

    await waitFor(() => {
      expect(useSettingsStore.getState().guildIdByCharId["101"]).toBe(
        "guild-red",
      );
    });
  });

  it("initializes a separate default after the current character changes", async () => {
    renderHook(() => useSelectedLootlogGuildInitialization());

    await waitFor(() => {
      expect(useSettingsStore.getState().guildIdByCharId["101"]).toBe(
        "guild-blue",
      );
    });

    setRuntime(202);
    act(() => {
      mocks.afterGameEventHandler?.();
    });

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
    useOthersStore.getState().setMany(others);
    setOnlineOwners(others);
    useSettingsStore.setState({
      guildIdByCharId: {
        "101": "guild-blue",
      },
    });
    mocks.getPlayersCatchingGuilds.mockResolvedValue({
      players: Object.values(others).map((other, index) => ({
        userId: "player-discord",
        accountId: String(other.d.account),
        characterId: String(other.d.id),
        guilds: index === 0 ? [{ id: "guild-blue", name: "Blue Guild" }] : [],
      })),
    });

    renderHook(() => useOtherCatchingGuildGlow());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(mocks.getPlayersCatchingGuilds).toHaveBeenCalledOnce();
    });
    expect(mocks.getPlayersCatchingGuilds).toHaveBeenCalledWith(
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
    useOthersStore.getState().setMany(others);
    setOnlineOwners(others);
    useSettingsStore.setState({
      guildIdByCharId: {
        "101": "guild-blue",
      },
    });
    mocks.getPlayersCatchingGuilds.mockImplementation(
      ({ players }: { players: Array<{ characterId: string }> }) => ({
        players: players.map((player) => ({
          userId: "player-discord",
          accountId: "9822301",
          characterId: player.characterId,
          guilds: [],
        })),
      }),
    );

    renderHook(() => useOtherCatchingGuildGlow());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(mocks.getPlayersCatchingGuilds).toHaveBeenCalledTimes(2);
    });
    expect(
      mocks.getPlayersCatchingGuilds.mock.calls[0]?.[0].players,
    ).toHaveLength(100);
    expect(
      mocks.getPlayersCatchingGuilds.mock.calls[1]?.[0].players,
    ).toHaveLength(25);
  });

  it("finishes every queued batch after an earlier batch error", async () => {
    const others = Object.fromEntries(
      Array.from({ length: 125 }, (_, index) => {
        const characterId = String(index + 1);
        return [characterId, createOther(characterId)];
      }),
    );
    useOthersStore.getState().setMany(others);
    setOnlineOwners(others);
    useSettingsStore.setState({
      guildIdByCharId: {
        "101": "guild-blue",
      },
    });
    mocks.getPlayersCatchingGuilds.mockRejectedValue(new Error("broken"));

    renderHook(() => useOtherCatchingGuildGlow());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(mocks.getPlayersCatchingGuilds).toHaveBeenCalledTimes(2);
      expect(
        useCharacterTooltipCatchingGuildsStore.getState().entriesByKey[
          "9822301:125"
        ]?.status,
      ).toBe("error");
    });
  });

  it("does not request or glow without a selected timers guild", () => {
    useOthersStore.getState().setMany({
      "1": createOther("1"),
    });
    setOnlineOwners({ "1": createOther("1") });

    renderHook(() => useOtherCatchingGuildGlow());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    expect(mocks.getPlayersCatchingGuilds).not.toHaveBeenCalled();
    expect(lootlogOtherGlowManager.getGlowCount()).toBe(0);
    expect(lootlogOtherGlowManager.getNativeGlowSuppressed()).toBe(false);
  });

  it("does not run or suppress native glow when all Discords are selected", () => {
    const other = createOther("1");
    useOthersStore.getState().setMany({ "1": other });
    setOnlineOwners({ "1": other });
    useSettingsStore.setState({
      guildIdByCharId: { "101": "all" },
    });

    renderHook(() => useOtherCatchingGuildGlow());
    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    expect(mocks.getPlayersCatchingGuilds).not.toHaveBeenCalled();
    expect(lootlogOtherGlowManager.getGlowCount()).toBe(0);
    expect(lootlogOtherGlowManager.getNativeGlowSuppressed()).toBe(false);
  });

  it("does not request when visible characters have no online owner", () => {
    useOthersStore.getState().setMany({
      "1": createOther("1"),
    });
    useSettingsStore.setState({
      guildIdByCharId: {
        "101": "guild-blue",
      },
    });

    renderHook(() => useOtherCatchingGuildGlow());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    expect(mocks.getPlayersCatchingGuilds).not.toHaveBeenCalled();
    expect(lootlogOtherGlowManager.getGlowColor("1")).toBe(
      LOOTLOG_OTHER_GLOW_UNKNOWN,
    );
  });

  it("requests visible characters when online owners become known after shift", async () => {
    const other = createOther("1");
    useOthersStore.getState().setMany({
      "1": other,
    });
    useSettingsStore.setState({
      guildIdByCharId: {
        "101": "guild-blue",
      },
    });
    mocks.getPlayersCatchingGuilds.mockResolvedValue({
      players: [
        {
          userId: "player-discord",
          accountId: String(other.d.account),
          characterId: String(other.d.id),
          guilds: [],
        },
      ],
    });

    renderHook(() => useOtherCatchingGuildGlow());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    expect(mocks.getPlayersCatchingGuilds).not.toHaveBeenCalled();

    act(() => {
      setOnlineOwners({ "1": other });
    });

    await waitFor(() => {
      expect(mocks.getPlayersCatchingGuilds).toHaveBeenCalledWith(
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

    useOthersStore.getState().setMany({ "1": firstOther });
    setOnlineOwners({ "1": firstOther, "2": secondOther });
    useSettingsStore.setState({
      guildIdByCharId: {
        "101": "guild-blue",
      },
    });
    mocks.getPlayersCatchingGuilds
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

    renderHook(() => useOtherCatchingGuildGlow());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(mocks.getPlayersCatchingGuilds).toHaveBeenCalledOnce();
    });

    act(() => {
      useOthersStore.getState().setMany({ "1": firstOther, "2": secondOther });
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
      expect(mocks.getPlayersCatchingGuilds).toHaveBeenCalledTimes(2);
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
    useOthersStore.getState().setMany({ "1": other });
    setOnlineOwners({ "1": other });
    useSettingsStore.setState({
      guildIdByCharId: {
        "101": "guild-blue",
      },
    });
    mocks.getPlayersCatchingGuilds.mockResolvedValue({
      players: [
        {
          userId: "player-discord",
          accountId: String(other.d.account),
          characterId: String(other.d.id),
          guilds: [{ id: "guild-blue", name: "Blue Guild" }],
        },
      ],
    });

    renderHook(() => useOtherCatchingGuildGlow());

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
