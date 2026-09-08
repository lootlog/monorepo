import { act, fireEvent, render, screen } from "@testing-library/react";
import { createNotificationTest } from "../notification-test";
import { getUsersControllerGetCurrentUserAccessibleGuildsQueryKey } from "@lootlog/client/main";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "@/store/settings.store";
import {
  type StoredNotification,
  useNotificationsStore,
} from "@/store/notifications.store";
import { NotificationsList } from "./notifications-list";

let test: ReturnType<typeof createNotificationTest>;
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
  beforeEach(() => {
    test = createNotificationTest();
    test.queryClient.setQueryData(
      getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      [],
    );
  });
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

    render(<NotificationsList notifications={[notification]} />, {
      wrapper: test.wrapper,
    });

    expect(
      screen.getByText("hello").closest("[data-lootlog-notification-id]"),
    ).toHaveClass("ll:animate-in", "ll:fade-in-0", "ll:slide-in-from-top-2");
    expect(
      screen.getByText("hello").closest("[data-lootlog-notification-id]"),
    ).toHaveAttribute(
      "data-lootlog-notification-id",
      notification.notificationId,
    );
  });

  it("renders without an animation class when animation effects are disabled", () => {
    useSettingsStore.setState({ animationEffectsEnabled: false });

    render(<NotificationsList notifications={[notification]} />, {
      wrapper: test.wrapper,
    });

    expect(
      screen.getByText("hello").closest("[data-lootlog-notification-id]"),
    ).not.toHaveClass("ll:animate-in");
  });

  it("stages a presentation that atomically started from an empty store", () => {
    useNotificationsStore.setState({
      latestNotificationAnimationCycle: 1,
      latestPresentationStartedEmpty: true,
    });

    render(<NotificationsList notifications={createNotifications(8)} />, {
      wrapper: test.wrapper,
    });

    expect(screen.getAllByText("hello")).toHaveLength(2);
  });

  it("renders an incremental presentation without bulk staging", () => {
    useNotificationsStore.setState({
      latestNotificationAnimationCycle: 1,
      latestPresentationStartedEmpty: false,
    });

    render(<NotificationsList notifications={createNotifications(8)} />, {
      wrapper: test.wrapper,
    });

    expect(screen.getAllByText("hello")).toHaveLength(8);
  });

  it("finishes a CSS exit before manually removing the notification", () => {
    vi.useFakeTimers();
    useSettingsStore.setState({ animationEffectsEnabled: true });
    const second = {
      ...notification,
      notificationId: "second",
      listKey: "second",
      message: "Second",
    };
    useNotificationsStore.setState({ notifications: [notification, second] });
    render(<NotificationsList notifications={[notification, second]} />, {
      wrapper: test.wrapper,
    });

    fireEvent.click(
      screen.getAllByRole("button", { name: "Zamknij powiadomienie" })[0],
    );

    expect(
      screen.getByText("hello").closest("[data-lootlog-notification-id]"),
    ).toHaveClass("ll:animate-out", "ll:fade-out-0");
    expect(useNotificationsStore.getState().notifications).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(useNotificationsStore.getState().notifications).toEqual([second]);
  });
});
