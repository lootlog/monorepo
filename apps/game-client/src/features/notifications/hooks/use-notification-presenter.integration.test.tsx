import { act, Profiler, type ProfilerOnRenderCallback } from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useNotificationPresenter,
  type NotificationPresentationRequest,
} from "./use-notification-presenter";
import { useNotificationsStore } from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";

const mocks = vi.hoisted(() => ({
  playSounds: vi.fn(),
}));

vi.mock("@/hooks/use-current-game-account-notification-settings", () => ({
  useCurrentGameAccountNotificationSettings: () => ({
    settings: {
      message: {
        autoHideTimeout: 0,
        sound: false,
      },
    },
  }),
}));

vi.mock("@/hooks/use-sound-playback", () => ({
  useSoundPlayback: () => ({ playSounds: mocks.playSounds }),
}));

let presentNotifications:
  | ((requests: readonly NotificationPresentationRequest[]) => void)
  | undefined;

const NotificationPresentationProbe = () => {
  presentNotifications = useNotificationPresenter().presentNotifications;
  const notificationCount = useNotificationsStore(
    (state) => state.notifications.length,
  );
  const open = useWindowsStore((state) => state.notifications.open);

  return <div>{`${notificationCount}:${open}`}</div>;
};

describe("useNotificationPresenter React batching", () => {
  beforeEach(() => {
    presentNotifications = undefined;
    useNotificationsStore.setState({
      notifications: [],
      notificationAutoHideByListKey: {},
      latestNotificationAnimationCycle: 0,
    });
    useWindowsStore.setState((state) => ({
      notifications: { ...state.notifications, open: false },
      currentWindowFocus: undefined,
      windowFocusHistory: [],
    }));
  });

  it("commits the notification and window stores together", () => {
    let updateCommits = 0;
    const onRender: ProfilerOnRenderCallback = (_id, phase) => {
      if (phase === "update") {
        updateCommits += 1;
      }
    };
    render(
      <Profiler id="notification-presentation" onRender={onRender}>
        <NotificationPresentationProbe />
      </Profiler>,
    );

    act(() => {
      presentNotifications?.([
        {
          notification: {
            notificationId: "notification-1",
            discordId: "discord-1",
            guildId: "guild-1",
            world: "fixture",
            createdAt: "2026-07-20T00:00:00.000Z",
            message: "hello",
            servers: ["guild-1"],
          },
        },
      ]);
    });

    expect(updateCommits).toBe(1);
  });
});
