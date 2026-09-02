import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultNotificationMutes } from "@lootlog/schema/user-preferences";
import { useCurrentUserNotificationMutes } from "@/hooks/use-current-user-notification-mutes";

const mockUseUserPreferences = vi.fn();

vi.mock("@/hooks/api/use-user-preferences", () => ({
  useUserPreferences: (...args: unknown[]) => mockUseUserPreferences(...args),
}));

vi.mock("@/store/global.store", () => ({
  useGlobalStore: (
    selector: (state: { gameState: { gameInitialized: boolean } }) => boolean,
  ) =>
    selector({
      gameState: {
        gameInitialized: true,
      },
    }),
}));

describe("useCurrentUserNotificationMutes", () => {
  beforeEach(() => {
    mockUseUserPreferences.mockReset();
  });

  it("returns default mutes while preferences are unavailable", () => {
    mockUseUserPreferences.mockReturnValue({
      data: undefined,
      isFetched: false,
      isLoading: true,
    });

    const { result } = renderHook(() => useCurrentUserNotificationMutes());

    expect(mockUseUserPreferences).toHaveBeenCalledWith(true);
    expect(result.current.isReady).toBe(false);
    expect(result.current.mutes).toEqual(defaultNotificationMutes);
  });

  it("marks the hook as ready once the query is fetched", () => {
    mockUseUserPreferences.mockReturnValue({
      data: undefined,
      isFetched: true,
      isLoading: false,
    });

    const { result } = renderHook(() => useCurrentUserNotificationMutes());

    expect(result.current.isReady).toBe(true);
    expect(result.current.mutes).toEqual(defaultNotificationMutes);
  });

  it("keeps the effective mutes reference stable while query data is unchanged", () => {
    const preferences = {
      mutes: {
        players: [{ discordId: "discord-1", guildId: "guild-1" }],
        npcs: [],
      },
    };
    mockUseUserPreferences.mockReturnValue({
      data: preferences,
      isFetched: true,
      isLoading: false,
    });

    const { result, rerender } = renderHook(() =>
      useCurrentUserNotificationMutes(),
    );
    const firstMutes = result.current.mutes;

    rerender();

    expect(result.current.mutes).toBe(firstMutes);
  });
});
