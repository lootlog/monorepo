import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultDetectorSettings,
  defaultNotificationsSettings,
} from "@lootlog/types";
import {
  createDetectorSettings,
  createNotificationsSettings,
} from "@/lib/game-account-preferences";
import { useCurrentGameAccountPreferences } from "@/hooks/use-current-game-account-preferences";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import { useGameStore } from "@/store/game.store";

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
    getAccountId: () => "202",
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
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "202",
        characterId: "101",
        currentHp: 1,
        icon: "hero.gif",
        level: 300,
        maxHp: 1,
        name: "Hero",
        profession: "w",
      },
      map: { id: 1, name: "Map", visibility: 30 },
      world: "pandora",
    });
  });

  it("keeps notification settings unready until stored values exist", () => {
    mockUseUserGameAccountPreferences.mockReturnValue({
      data: undefined,
      isFetched: true,
    });

    const { result } = renderHook(() =>
      useCurrentGameAccountNotificationSettings(),
    );

    expect(result.current.accountId).toBe("202");
    expect(result.current.isReady).toBe(false);
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
    expect(result.current.data).toEqual({ accountId: "202" });
    expect(result.current.isFetching).toBe(false);
  });

  it("marks notification settings as ready after notification defaults are stored", () => {
    mockUseUserGameAccountPreferences.mockReturnValue({
      data: {
        accountId: "202",
        notifications: createNotificationsSettings(["guild-1"]),
        detector: createDetectorSettings(),
        hasStoredNotifications: true,
        hasStoredDetector: false,
        hasStoredPreferences: false,
      },
      isFetched: true,
    });

    const { result } = renderHook(() =>
      useCurrentGameAccountNotificationSettings(),
    );

    expect(result.current.isReady).toBe(true);
    expect(result.current.settings).toEqual(
      createNotificationsSettings(["guild-1"]),
    );
  });

  it("keeps detector settings unready until stored values exist or query errors", () => {
    mockUseUserGameAccountPreferences.mockReturnValue({
      data: undefined,
      isFetched: true,
      isError: false,
    });

    const { result } = renderHook(() =>
      useCurrentGameAccountDetectorSettings(),
    );

    expect(result.current.accountId).toBe("202");
    expect(result.current.isReady).toBe(false);
    expect(result.current.settings).toEqual(defaultDetectorSettings);
  });

  it("treats detector settings as ready after a query error fallback", () => {
    mockUseUserGameAccountPreferences.mockReturnValue({
      data: undefined,
      isFetched: true,
      isError: true,
    });

    const { result } = renderHook(() =>
      useCurrentGameAccountDetectorSettings(),
    );

    expect(result.current.isReady).toBe(true);
    expect(result.current.settings).toEqual(defaultDetectorSettings);
  });
});
