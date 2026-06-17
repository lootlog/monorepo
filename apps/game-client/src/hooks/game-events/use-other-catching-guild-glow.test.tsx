import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Other } from "@lootlog/margonem/others";
import {
  LOOTLOG_OTHER_GLOW_BLUE,
  LOOTLOG_OTHER_GLOW_RED_ORANGE,
  lootlogOtherGlowManager,
} from "@/lib/lootlog-other-glow-manager";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useOthersStore } from "@/store/others.store";
import { useSettingsStore } from "@/store/settings.store";

const mocks = vi.hoisted(() => ({
  getPlayersCatchingGuilds: vi.fn(),
}));

vi.mock(
  "@/lib/api/generated/main/user-lootlog-config/user-lootlog-config",
  () => ({
    userLootlogConfigControllerGetPlayersCatchingGuilds:
      mocks.getPlayersCatchingGuilds,
  }),
);

import { useOtherCatchingGuildGlow } from "./use-other-catching-guild-glow";

const originalWindowEngine = window.Engine;

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

function setRuntime(): void {
  Object.defineProperty(window, "Engine", {
    configurable: true,
    value: {
      hero: {
        d: {
          id: "hero-1",
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
}

describe("useOtherCatchingGuildGlow", () => {
  beforeEach(() => {
    mocks.getPlayersCatchingGuilds.mockReset();
    lootlogOtherGlowManager.cleanup();
    useCharacterTooltipCatchingGuildsStore.getState().clear();
    useOnlineCharacterOwnersStore.getState().clearOwners();
    useOthersStore.getState().clearOthers();
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
        "hero-1": "guild-blue",
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
    expect(mocks.getPlayersCatchingGuilds).toHaveBeenCalledWith({
      players: Object.values(others).map((other) => ({
        userId: "player-discord",
        accountId: String(other.d.account),
        characterId: String(other.d.id),
      })),
    });

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
        "hero-1": "guild-blue",
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

  it("stops fetching further batches after a batch error", async () => {
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
        "hero-1": "guild-blue",
      },
    });
    mocks.getPlayersCatchingGuilds.mockRejectedValue(new Error("broken"));

    renderHook(() => useOtherCatchingGuildGlow());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(mocks.getPlayersCatchingGuilds).toHaveBeenCalledOnce();
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

  it("does not request when visible characters have no online owner", () => {
    useOthersStore.getState().setMany({
      "1": createOther("1"),
    });
    useSettingsStore.setState({
      guildIdByCharId: {
        "hero-1": "guild-blue",
      },
    });

    renderHook(() => useOtherCatchingGuildGlow());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    expect(mocks.getPlayersCatchingGuilds).not.toHaveBeenCalled();
    expect(lootlogOtherGlowManager.getGlowCount()).toBe(0);
  });

  it("requests visible characters when online owners become known after shift", async () => {
    const other = createOther("1");
    useOthersStore.getState().setMany({
      "1": other,
    });
    useSettingsStore.setState({
      guildIdByCharId: {
        "hero-1": "guild-blue",
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
      expect(mocks.getPlayersCatchingGuilds).toHaveBeenCalledWith({
        players: [
          {
            userId: "player-discord",
            accountId: String(other.d.account),
            characterId: String(other.d.id),
          },
        ],
      });
    });
  });

  it("clears glows when shift is released", async () => {
    const other = createOther("1");
    useOthersStore.getState().setMany({ "1": other });
    setOnlineOwners({ "1": other });
    useSettingsStore.setState({
      guildIdByCharId: {
        "hero-1": "guild-blue",
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
