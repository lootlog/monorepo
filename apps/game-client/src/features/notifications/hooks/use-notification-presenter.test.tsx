import { createNotificationTest } from "../notification-test";
import {
  useNotificationsStore,
  type NotificationWithServers,
} from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useNotificationPresenter } from "./use-notification-presenter";

let test: ReturnType<typeof createNotificationTest>;

const createNotification = (
  notificationId: string,
): NotificationWithServers => ({
  notificationId,
  discordId: "discord-1",
  guildId: "guild-1",
  world: "pandora",
  createdAt: "2026-04-17T10:00:00.000Z",
  message: notificationId,
  servers: ["guild-1"],
});

describe("useNotificationPresenter", () => {
  beforeEach(() => {
    test = createNotificationTest();
  });
  it("presents a batch atomically with auto-hide deadlines and opens the window once", () => {
    const { result } = renderHook(() => useNotificationPresenter(), {
      wrapper: test.wrapper,
    });

    act(() =>
      result.current.presentNotifications([
        { notification: createNotification("notification-1") },
        { notification: createNotification("notification-2") },
      ]),
    );

    const state = useNotificationsStore.getState();
    expect(state.latestNotificationAnimationCycle).toBe(1);
    expect(state.notifications).toHaveLength(2);
    expect(Object.values(state.notificationAutoHideByListKey)).toEqual([
      expect.objectContaining({ durationMs: 30000 }),
      expect.objectContaining({ durationMs: 30000 }),
    ]);
    expect(useWindowsStore.getState().notifications.open).toBe(true);
  });

  it("plays a configured sound once for duplicate categories in a batch", () => {
    test.preferences.notifications.message.sound = true;
    test.setPreferences();

    const { result } = renderHook(() => useNotificationPresenter(), {
      wrapper: test.wrapper,
    });

    act(() =>
      result.current.presentNotifications([
        { notification: createNotification("notification-1") },
        { notification: createNotification("notification-2") },
      ]),
    );

    expect(test.play).toHaveBeenCalledOnce();
  });
});
