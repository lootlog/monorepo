import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type StoredNotification,
  useNotificationsStore,
} from "@/store/notifications.store";
import { useVisibleNotifications } from "./use-visible-notifications";

const mockUseCurrentGameAccountNotificationSettings = vi.fn();

vi.mock("@/hooks/use-current-game-account-notification-settings", () => ({
  useCurrentGameAccountNotificationSettings: () =>
    mockUseCurrentGameAccountNotificationSettings(),
}));

vi.mock("@/lib/game", () => ({
  Game: {
    getWorldName: () => "pandora",
  },
}));

const createStoredNotification = (
  overrides?: Partial<StoredNotification>,
): StoredNotification => ({
  notificationId: "notification-1",
  discordId: "discord-1",
  guildId: "guild-1",
  world: "pandora",
  createdAt: "2026-04-17T10:00:00.000Z",
  message: "Hej",
  servers: ["guild-1"],
  listKey: "notification-1",
  receivedAtMs: Date.now(),
  ...overrides,
});

describe("useVisibleNotifications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-17T10:00:00.000Z"));
    mockUseCurrentGameAccountNotificationSettings.mockReset();
    mockUseCurrentGameAccountNotificationSettings.mockReturnValue({
      settings: {
        message: {
          show: true,
          ignoreOtherWorlds: false,
          guildIds: ["guild-1"],
          autoHideTimeout: 30,
        },
      },
    });
    useNotificationsStore.setState({
      notifications: [],
      notificationAutoHideByListKey: {},
      latestNotificationAnimationCycle: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules cleanup with timeouts instead of interval polling", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    useNotificationsStore.setState({
      notifications: [
        createStoredNotification({
          notificationId: "notification-1",
          listKey: "notification-1",
          receivedAtMs: Date.now(),
        }),
        createStoredNotification({
          notificationId: "notification-2",
          listKey: "notification-2",
          receivedAtMs: Date.now(),
        }),
      ],
      notificationAutoHideByListKey: {
        "notification-1": {
          deadlineMs: Date.now() + 1_000,
          pausedRemainingMs: null,
          durationMs: 1_000,
        },
        "notification-2": {
          deadlineMs: Date.now() + 2_000,
          pausedRemainingMs: null,
          durationMs: 2_000,
        },
      },
    });

    renderHook(() => useVisibleNotifications({ autoCleanup: true }));

    expect(setIntervalSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(999);
    });

    expect(useNotificationsStore.getState().notifications).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(
      useNotificationsStore
        .getState()
        .notifications.map((notification) => notification.notificationId),
    ).toEqual(["notification-2"]);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(useNotificationsStore.getState().notifications).toEqual([]);

    setIntervalSpy.mockRestore();
  });

  it("does not auto-remove paused notifications", () => {
    useNotificationsStore.setState({
      notifications: [
        createStoredNotification({
          notificationId: "notification-1",
          listKey: "notification-1",
          receivedAtMs: Date.now(),
        }),
      ],
      notificationAutoHideByListKey: {
        "notification-1": {
          deadlineMs: null,
          pausedRemainingMs: 1_000,
          durationMs: 1_000,
        },
      },
    });

    renderHook(() => useVisibleNotifications({ autoCleanup: true }));

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(
      useNotificationsStore
        .getState()
        .notifications.map((notification) => notification.notificationId),
    ).toEqual(["notification-1"]);
  });

  it("falls back to notification timeout when auto-hide state is missing", () => {
    useNotificationsStore.setState({
      notifications: [
        createStoredNotification({
          notificationId: "notification-1",
          listKey: "notification-1",
          receivedAtMs: Date.now(),
        }),
      ],
      notificationAutoHideByListKey: {},
    });

    renderHook(() => useVisibleNotifications({ autoCleanup: true }));

    act(() => {
      vi.advanceTimersByTime(29_999);
    });

    expect(
      useNotificationsStore
        .getState()
        .notifications.map((notification) => notification.notificationId),
    ).toEqual(["notification-1"]);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(useNotificationsStore.getState().notifications).toEqual([]);
  });
});
