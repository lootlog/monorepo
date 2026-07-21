import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationWithServers } from "@/store/notifications.store";
import { useNotificationPresenter } from "./use-notification-presenter";

const mocks = vi.hoisted(() => ({
  playSounds: vi.fn(),
  presentNotifications: vi.fn(),
  setOpen: vi.fn(),
  settings: {
    message: {
      autoHideTimeout: 30,
      sound: false,
    },
  },
}));

vi.mock("@/hooks/use-current-game-account-notification-settings", () => ({
  useCurrentGameAccountNotificationSettings: () => ({
    settings: mocks.settings,
  }),
}));

vi.mock("@/hooks/use-sound-playback", () => ({
  useSoundPlayback: () => ({ playSounds: mocks.playSounds }),
}));

vi.mock("@/store/notifications.store", () => ({
  useNotificationsStore: (
    selector: (state: {
      presentNotifications: typeof mocks.presentNotifications;
    }) => unknown,
  ) => selector({ presentNotifications: mocks.presentNotifications }),
}));

vi.mock("@/store/windows.store", () => ({
  useWindowsStore: (
    selector: (state: { setOpen: typeof mocks.setOpen }) => unknown,
  ) => selector({ setOpen: mocks.setOpen }),
}));

const createNotification = (
  notificationId: string,
): NotificationWithServers => ({
  notificationId,
  discordId: "discord-1",
  guildId: "guild-1",
  world: "pandora",
  createdAt: "2026-04-17T10:00:00.000Z",
  message: "Hej",
  servers: ["guild-1"],
});

describe("useNotificationPresenter", () => {
  beforeEach(() => {
    mocks.playSounds.mockReset();
    mocks.presentNotifications.mockReset();
    mocks.setOpen.mockReset();
    mocks.settings.message = {
      autoHideTimeout: 30,
      sound: false,
    };
  });

  it("presents a batch atomically with auto-hide deadlines and opens the window once", () => {
    const { result } = renderHook(() => useNotificationPresenter());

    result.current.presentNotifications([
      { notification: createNotification("notification-1") },
      { notification: createNotification("notification-2") },
    ]);

    expect(mocks.presentNotifications).toHaveBeenCalledTimes(1);
    expect(mocks.presentNotifications).toHaveBeenCalledWith([
      {
        notification: expect.objectContaining({
          notificationId: "notification-1",
        }),
        autoHideDurationMs: 30_000,
      },
      {
        notification: expect.objectContaining({
          notificationId: "notification-2",
        }),
        autoHideDurationMs: 30_000,
      },
    ]);
    expect(mocks.setOpen).toHaveBeenCalledTimes(1);
    expect(mocks.setOpen).toHaveBeenCalledWith("notifications", true);
  });

  it("plays a configured sound once for duplicate categories in a batch", () => {
    mocks.settings.message.sound = true;
    const { result } = renderHook(() => useNotificationPresenter());

    result.current.presentNotifications([
      { notification: createNotification("notification-1") },
      { notification: createNotification("notification-2") },
    ]);

    expect(mocks.playSounds).toHaveBeenCalledTimes(1);
    expect(mocks.playSounds).toHaveBeenCalledWith(
      "notifications",
      new Set(["message"]),
    );
  });
});
