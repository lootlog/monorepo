import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { Other } from "@lootlog/margonem";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { characterTooltipTransforms } from "@/lib/margonem-tooltips";

const mocks = vi.hoisted(() => ({
  getPlayerCatchingGuilds: vi.fn(),
}));

vi.mock(
  "@/lib/api/generated/main/user-lootlog-config/user-lootlog-config",
  () => ({
    userLootlogConfigControllerGetPlayerCatchingGuilds:
      mocks.getPlayerCatchingGuilds,
  }),
);

import { useCharacterTooltipCatchingGuilds } from "./use-character-tooltip-catching-guilds";

function createWrapper(queryClient: QueryClient) {
  return function TestWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

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

describe("useCharacterTooltipCatchingGuilds", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    characterTooltipTransforms.clear();
    useCharacterTooltipCatchingGuildsStore.getState().clear();
    mocks.getPlayerCatchingGuilds.mockReset();
  });

  it("fetches catching guilds on shift for the active other and caches the result", async () => {
    mocks.getPlayerCatchingGuilds.mockResolvedValue({
      accountId: "9822301",
      characterId: "617",
      guilds: [{ id: "guild-1", name: "Alpha" }],
    });

    renderHook(() => useCharacterTooltipCatchingGuilds(), {
      wrapper: createWrapper(queryClient),
    });

    const other = createOther();
    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setActiveOther(other);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    });

    await waitFor(() => {
      expect(mocks.getPlayerCatchingGuilds).toHaveBeenCalledWith({
        accountId: "9822301",
        characterId: "617",
      });
    });
    await waitFor(() => {
      expect(
        useCharacterTooltipCatchingGuildsStore.getState().entriesByKey[
          "9822301:617"
        ],
      ).toEqual({
        guilds: [{ id: "guild-1", name: "Alpha" }],
        status: "success",
      });
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    });

    expect(mocks.getPlayerCatchingGuilds).toHaveBeenCalledOnce();
  });

  it("stores an error state when the request fails", async () => {
    mocks.getPlayerCatchingGuilds.mockRejectedValue(new Error("broken"));

    renderHook(() => useCharacterTooltipCatchingGuilds(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
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
    mocks.getPlayerCatchingGuilds.mockResolvedValueOnce({
      accountId: "9822301",
      characterId: "617",
      guilds: [{ id: "guild-1", name: "Alpha" }],
    });
    mocks.getPlayerCatchingGuilds.mockResolvedValueOnce({
      accountId: "9822301",
      characterId: "30016",
      guilds: [{ id: "guild-2", name: "Beta" }],
    });

    renderHook(() => useCharacterTooltipCatchingGuilds(), {
      wrapper: createWrapper(queryClient),
    });

    const other = createOther();
    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setActiveOther(other);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    });

    await waitFor(() => {
      expect(mocks.getPlayerCatchingGuilds).toHaveBeenCalledWith({
        accountId: "9822301",
        characterId: "617",
      });
    });

    act(() => {
      other.d.id = "30016";
      useCharacterTooltipCatchingGuildsStore.getState().setActiveOther(other);
    });

    await waitFor(() => {
      expect(mocks.getPlayerCatchingGuilds).toHaveBeenCalledWith({
        accountId: "9822301",
        characterId: "30016",
      });
    });
    expect(mocks.getPlayerCatchingGuilds).toHaveBeenCalledTimes(2);
  });
});
