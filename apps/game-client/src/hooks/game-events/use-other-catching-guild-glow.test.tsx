import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Other } from "@lootlog/margonem";
import {
  LOOTLOG_OTHER_GLOW_BLUE,
  LOOTLOG_OTHER_GLOW_RED_ORANGE,
  lootlogOtherGlowManager,
} from "@/lib/lootlog-other-glow-manager";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
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
    useSettingsStore.setState({
      guildIdByCharId: {
        "hero-1": "guild-blue",
      },
    });
    mocks.getPlayersCatchingGuilds.mockResolvedValue({
      players: Object.values(others).map((other, index) => ({
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

  it("does not request or glow without a selected timers guild", () => {
    useOthersStore.getState().setMany({
      "1": createOther("1"),
    });

    renderHook(() => useOtherCatchingGuildGlow());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    expect(mocks.getPlayersCatchingGuilds).not.toHaveBeenCalled();
    expect(lootlogOtherGlowManager.getGlowCount()).toBe(0);
    expect(lootlogOtherGlowManager.getNativeGlowSuppressed()).toBe(false);
  });

  it("clears glows when shift is released", async () => {
    const other = createOther("1");
    useOthersStore.getState().setMany({ "1": other });
    useSettingsStore.setState({
      guildIdByCharId: {
        "hero-1": "guild-blue",
      },
    });
    mocks.getPlayersCatchingGuilds.mockResolvedValue({
      players: [
        {
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
