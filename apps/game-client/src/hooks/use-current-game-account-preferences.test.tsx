import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultDetectorSettings,
  defaultNotificationsSettings,
} from "@lootlog/types";
import { useCurrentGameAccountPreferences } from "@/hooks/use-current-game-account-preferences";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";

const mockUseUserGameAccountPreferences = vi.fn();

vi.mock("@/hooks/api/use-user-account-preferences", () => ({
  useUserGameAccountPreferences: (...args: unknown[]) =>
    mockUseUserGameAccountPreferences(...args),
}));

vi.mock("@/lib/game", () => ({
  Game: {
    hero: {
      account: 202,
    },
  },
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

describe("current game account preference hooks", () => {
  beforeEach(() => {
    mockUseUserGameAccountPreferences.mockReset();
  });

  it("treats fetched notification preferences without data as ready defaults", () => {
    mockUseUserGameAccountPreferences.mockReturnValue({
      data: undefined,
      isFetched: true,
    });

    const { result } = renderHook(() =>
      useCurrentGameAccountNotificationSettings(),
    );

    expect(result.current.accountId).toBe("202");
    expect(result.current.isReady).toBe(true);
    expect(result.current.settings).toEqual(defaultNotificationsSettings);
  });

  it("returns shared account preference query state", () => {
    mockUseUserGameAccountPreferences.mockReturnValue({
      data: { accountId: "202" },
      isFetched: true,
      isFetching: false,
      isLoading: false,
    });

    const { result } = renderHook(() => useCurrentGameAccountPreferences());

    expect(result.current.accountId).toBe("202");
    expect(result.current.isReady).toBe(true);
    expect(result.current.data).toEqual({ accountId: "202" });
    expect(result.current.isFetching).toBe(false);
  });

  it("treats fetched detector preferences without data as ready defaults", () => {
    mockUseUserGameAccountPreferences.mockReturnValue({
      data: undefined,
      isFetched: true,
    });

    const { result } = renderHook(() =>
      useCurrentGameAccountDetectorSettings(),
    );

    expect(result.current.accountId).toBe("202");
    expect(result.current.isReady).toBe(true);
    expect(result.current.settings).toEqual(defaultDetectorSettings);
  });
});
