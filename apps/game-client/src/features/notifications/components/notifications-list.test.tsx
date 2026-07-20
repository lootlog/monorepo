import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "@/store/settings.store";
import {
  type StoredNotification,
  useNotificationsStore,
} from "@/store/notifications.store";
import { NotificationsList } from "./notifications-list";

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

vi.mock("@/features/notifications/components/single-notification", () => ({
  SingleNotification: ({
    notification,
    onRemoveNotification,
  }: {
    notification: StoredNotification;
    onRemoveNotification: (notificationId: string) => void;
  }) => (
    <button
      data-testid="single-notification"
      onClick={() => onRemoveNotification(notification.notificationId)}
    >
      {notification.listKey}
    </button>
  ),
}));

vi.mock(
  "@/features/notifications/hooks/use-notification-guild-members",
  () => ({
    useNotificationGuildMembers: () => ({}),
  }),
);

vi.mock("@/hooks/use-current-user-notification-mutes", () => ({
  useCurrentUserNotificationMutes: () => ({
    isReady: true,
    mutes: { players: [], npcs: [] },
  }),
}));

vi.mock("@/hooks/api/use-user-preferences", () => ({
  useUpdateUserPreferences: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
}));

vi.mock("@/lib/api/generated/main/party-ready-room/party-ready-room", () => ({
  usePartyReadyRoomControllerApply: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
}));

vi.mock("@/lib/api/generated-helpers", () => ({
  buildCurrentCharacterPayload: () => ({}),
  getGuildNamesById: () => ({}),
}));

vi.mock("@/lib/api/generated/main/users/users", () => ({
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey: () => ["guilds"],
  useUsersControllerGetCurrentUserAccessibleGuilds: () => ({ data: [] }),
}));

const notification: StoredNotification = {
  createdAt: "2026-06-22T00:00:00.000Z",
  discordId: "discord-1",
  guildId: "guild-1",
  listKey: "notification-1",
  message: "hello",
  notificationId: "notification-1",
  receivedAtMs: 1,
  servers: ["guild-1"],
  type: "chat-mention",
  world: "world",
};

const createNotifications = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    ...notification,
    listKey: `notification-${index}`,
    notificationId: `notification-${index}`,
  }));

describe("NotificationsList", () => {
  afterEach(() => {
    act(() => {
      useSettingsStore.setState(useSettingsStore.getInitialState(), true);
      useNotificationsStore.setState(
        useNotificationsStore.getInitialState(),
        true,
      );
    });
    vi.useRealTimers();
  });

  it("uses a CSS-only entry animation without whole-list layout animation", () => {
    useSettingsStore.setState({ animationEffectsEnabled: true });

    render(<NotificationsList notifications={[notification]} />);

    expect(screen.getByTestId("single-notification").parentElement).toHaveClass(
      "ll:animate-in",
      "ll:fade-in-0",
      "ll:slide-in-from-top-2",
    );
    expect(
      screen.getByTestId("single-notification").parentElement,
    ).toHaveAttribute(
      "data-lootlog-notification-id",
      notification.notificationId,
    );
  });

  it("renders without an animation class when animation effects are disabled", () => {
    useSettingsStore.setState({ animationEffectsEnabled: false });

    render(<NotificationsList notifications={[notification]} />);

    expect(
      screen.getByTestId("single-notification").parentElement,
    ).not.toHaveClass("ll:animate-in");
  });

  it("stages a presentation that atomically started from an empty store", () => {
    useNotificationsStore.setState({
      latestNotificationAnimationCycle: 1,
      latestPresentationStartedEmpty: true,
    });

    render(<NotificationsList notifications={createNotifications(8)} />);

    expect(screen.getAllByTestId("single-notification")).toHaveLength(2);
  });

  it("renders an incremental presentation without bulk staging", () => {
    useNotificationsStore.setState({
      latestNotificationAnimationCycle: 1,
      latestPresentationStartedEmpty: false,
    });

    render(<NotificationsList notifications={createNotifications(8)} />);

    expect(screen.getAllByTestId("single-notification")).toHaveLength(8);
  });

  it("finishes a CSS exit before manually removing the notification", () => {
    vi.useFakeTimers();
    useSettingsStore.setState({ animationEffectsEnabled: true });
    useNotificationsStore.setState({ notifications: [notification] });
    render(<NotificationsList notifications={[notification]} />);

    fireEvent.click(screen.getByTestId("single-notification"));

    expect(screen.getByTestId("single-notification").parentElement).toHaveClass(
      "ll:animate-out",
      "ll:fade-out-0",
    );
    expect(useNotificationsStore.getState().notifications).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(useNotificationsStore.getState().notifications).toEqual([]);
  });
});
