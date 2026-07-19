import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Other } from "@lootlog/margonem/others";
import {
  getOtherCatchingGuildsTarget,
  useCharacterTooltipCatchingGuildsStore,
} from "@/store/character-tooltip-catching-guilds.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useSettingsStore } from "@/store/settings.store";
import { characterTooltipTransforms } from "@/lib/margonem-tooltips/registry";

const mocks = vi.hoisted(() => ({
  getPlayersCatchingGuilds: vi.fn(),
  refreshActiveOtherCanvasTooltip: vi.fn(),
}));

vi.mock(
  "@/lib/api/generated/main/user-lootlog-config/user-lootlog-config",
  () => ({
    userLootlogConfigControllerGetPlayersCatchingGuilds:
      mocks.getPlayersCatchingGuilds,
  }),
);

vi.mock("@/lib/margonem-tooltips/patcher", () => ({
  refreshActiveOtherCanvasTooltip: mocks.refreshActiveOtherCanvasTooltip,
}));

import { useCharacterTooltipCatchingGuilds } from "./use-character-tooltip-catching-guilds";

function createOther(): Other {
  const other = {
    d: {
      account: 9822301,
      icon: "other.gif",
      id: "617",
      lvl: 300,
      nick: "Other",
      prof: "w",
    },
    createStrTip: () => "<div>Other</div>",
    tipUpdate: vi.fn(),
  };

  return other as unknown as Other;
}

function setOnlineOwner(characterId = "617"): void {
  useOnlineCharacterOwnersStore.getState().setPresenceResponse({
    "player-discord": [
      {
        discordId: "player-discord",
        isAfk: false,
        player: {
          accountId: "9822301",
          characterId,
          icon: "other.gif",
          lvl: 300,
          name: "Other",
          prof: "w",
          world: "tempest",
        },
      },
    ],
  });
}

describe("useCharacterTooltipCatchingGuilds", () => {
  beforeEach(() => {
    characterTooltipTransforms.clear();
    useCharacterTooltipCatchingGuildsStore.getState().clear();
    useOnlineCharacterOwnersStore.getState().clearOwners();
    useSettingsStore.setState({
      guildIdByCharId: { "hero-1": "guild-1" },
    });
    Object.defineProperty(window, "Engine", {
      configurable: true,
      value: { hero: { d: { id: "hero-1" } } },
    });
    mocks.getPlayersCatchingGuilds.mockReset();
    mocks.refreshActiveOtherCanvasTooltip.mockReset();
  });

  it("fetches catching guilds on shift for the active other and caches the result", async () => {
    mocks.getPlayersCatchingGuilds.mockResolvedValue({
      players: [
        {
          userId: "player-discord",
          accountId: "9822301",
          characterId: "617",
          guilds: [{ id: "guild-1", name: "Alpha" }],
        },
      ],
    });

    renderHook(() => useCharacterTooltipCatchingGuilds());

    const other = createOther();
    act(() => {
      setOnlineOwner();
      useCharacterTooltipCatchingGuildsStore.getState().setActiveOther(other);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    });

    await waitFor(() => {
      expect(mocks.getPlayersCatchingGuilds).toHaveBeenCalledWith(
        {
          players: [
            {
              userId: "player-discord",
              accountId: "9822301",
              characterId: "617",
            },
          ],
        },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
    await waitFor(() => {
      expect(
        useCharacterTooltipCatchingGuildsStore.getState().entriesByKey[
          "9822301:617"
        ]?.status,
      ).toBe("success");
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    });

    expect(mocks.getPlayersCatchingGuilds).toHaveBeenCalledOnce();
  });

  it("stores an error state when the request fails", async () => {
    mocks.getPlayersCatchingGuilds.mockRejectedValue(new Error("broken"));

    renderHook(() => useCharacterTooltipCatchingGuilds());

    act(() => {
      setOnlineOwner();
      useCharacterTooltipCatchingGuildsStore
        .getState()
        .setActiveOther(createOther());
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    });

    await waitFor(() => {
      expect(
        useCharacterTooltipCatchingGuildsStore.getState().entriesByKey[
          "9822301:617"
        ]?.status,
      ).toBe("error");
    });
  });

  it("fetches again when the same other object points at a different character", async () => {
    mocks.getPlayersCatchingGuilds.mockResolvedValueOnce({
      players: [
        {
          userId: "player-discord",
          accountId: "9822301",
          characterId: "617",
          guilds: [{ id: "guild-1", name: "Alpha" }],
        },
      ],
    });
    mocks.getPlayersCatchingGuilds.mockResolvedValueOnce({
      players: [
        {
          userId: "player-discord",
          accountId: "9822301",
          characterId: "30016",
          guilds: [{ id: "guild-2", name: "Beta" }],
        },
      ],
    });

    renderHook(() => useCharacterTooltipCatchingGuilds());

    const other = createOther();
    act(() => {
      setOnlineOwner();
      useCharacterTooltipCatchingGuildsStore.getState().setActiveOther(other);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    });

    await waitFor(() => {
      expect(mocks.getPlayersCatchingGuilds.mock.calls[0]?.[0]).toEqual({
        players: [
          {
            userId: "player-discord",
            accountId: "9822301",
            characterId: "617",
          },
        ],
      });
    });

    act(() => {
      other.d.id = "30016";
      setOnlineOwner("30016");
      useCharacterTooltipCatchingGuildsStore.getState().setActiveOther(other);
    });

    await waitFor(() => {
      expect(mocks.getPlayersCatchingGuilds.mock.calls[1]?.[0]).toEqual({
        players: [
          {
            userId: "player-discord",
            accountId: "9822301",
            characterId: "30016",
          },
        ],
      });
    });
    expect(mocks.getPlayersCatchingGuilds).toHaveBeenCalledTimes(2);
  });

  it("does not fetch when the active other has no online owner", () => {
    renderHook(() => useCharacterTooltipCatchingGuilds());

    act(() => {
      useCharacterTooltipCatchingGuildsStore
        .getState()
        .setActiveOther(createOther());
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    });

    expect(mocks.getPlayersCatchingGuilds).not.toHaveBeenCalled();
  });

  it("does not fetch when all Discords are selected", () => {
    useSettingsStore.setState({
      guildIdByCharId: { "hero-1": "all" },
    });
    renderHook(() => useCharacterTooltipCatchingGuilds());

    act(() => {
      setOnlineOwner();
      useCharacterTooltipCatchingGuildsStore
        .getState()
        .setActiveOther(createOther());
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    });

    expect(mocks.getPlayersCatchingGuilds).not.toHaveBeenCalled();
  });

  it("fetches when the online owner becomes known after hovering", async () => {
    mocks.getPlayersCatchingGuilds.mockResolvedValue({
      players: [
        {
          userId: "player-discord",
          accountId: "9822301",
          characterId: "617",
          guilds: [{ id: "guild-1", name: "Alpha" }],
        },
      ],
    });

    renderHook(() => useCharacterTooltipCatchingGuilds());

    act(() => {
      useCharacterTooltipCatchingGuildsStore
        .getState()
        .setActiveOther(createOther());
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    });

    expect(mocks.getPlayersCatchingGuilds).not.toHaveBeenCalled();

    act(() => {
      setOnlineOwner();
    });

    await waitFor(() => {
      expect(mocks.getPlayersCatchingGuilds.mock.calls[0]?.[0]).toEqual({
        players: [
          {
            userId: "player-discord",
            accountId: "9822301",
            characterId: "617",
          },
        ],
      });
    });
  });

  it("refreshes the active tooltip when the coordinator cache updates", async () => {
    const other = createOther();
    renderHook(() => useCharacterTooltipCatchingGuilds());

    act(() => {
      setOnlineOwner();
      useCharacterTooltipCatchingGuildsStore.getState().setActiveOther(other);
      const target = getOtherCatchingGuildsTarget(other);
      if (!target) throw new Error("Expected an online player target");
      useCharacterTooltipCatchingGuildsStore.getState().setLoading(target);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    });

    await waitFor(() => {
      expect(mocks.refreshActiveOtherCanvasTooltip).toHaveBeenCalled();
    });
    mocks.refreshActiveOtherCanvasTooltip.mockClear();

    act(() => {
      const target = getOtherCatchingGuildsTarget(other);
      if (!target) throw new Error("Expected an online player target");
      useCharacterTooltipCatchingGuildsStore
        .getState()
        .setSuccess(target, [{ id: "guild-1", name: "Alpha" }], Date.now());
    });

    await waitFor(() => {
      expect(mocks.refreshActiveOtherCanvasTooltip).toHaveBeenCalledOnce();
    });
    expect(mocks.getPlayersCatchingGuilds).toHaveBeenCalledOnce();
  });

  it("resets shift state on window blur", () => {
    renderHook(() => useCharacterTooltipCatchingGuilds());

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    });

    expect(
      useCharacterTooltipCatchingGuildsStore.getState().isShiftPressed,
    ).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("blur"));
    });

    expect(
      useCharacterTooltipCatchingGuildsStore.getState().isShiftPressed,
    ).toBe(false);
  });
});
