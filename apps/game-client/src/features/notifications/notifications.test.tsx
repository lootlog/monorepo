import { act, fireEvent, render, screen } from "@testing-library/react";
import { getUsersControllerGetCurrentUserAccessibleGuildsQueryKey } from "@lootlog/client/main";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createNotificationTest } from "@/features/notifications/notification-test";
import { useSettingsStore } from "@/store/settings.store";
import {
  type StoredNotification,
  useNotificationsStore,
} from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import { Notifications } from "./notifications";

let test: ReturnType<typeof createNotificationTest>;

const createMention = (id: string, message: string): StoredNotification => ({
  createdAt: "2026-06-22T00:00:00.000Z",
  discordId: "discord-1",
  guildId: "guild-1",
  listKey: id,
  message,
  notificationId: id,
  receivedAtMs: Date.now(),
  servers: ["guild-1"],
  type: "chat-mention",
  world: "luvia",
});

const seedOpenWindow = () => {
  useNotificationsStore.setState({
    notifications: [
      createMention("first", "Pierwsza"),
      createMention("second", "Druga"),
    ],
  });
  useWindowsStore.getState().setOpen("notifications", true);
};

beforeEach(() => {
  test = createNotificationTest();
  test.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [],
  );
  useSettingsStore.setState({ animationEffectsEnabled: false });
});

afterEach(() => {
  vi.useRealTimers();
  act(() => {
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
    useWindowsStore.getState().setOpen("notifications", false);
  });
});

it("keeps notifications when the window closes and empties it only on clear", () => {
  seedOpenWindow();
  render(<Notifications />, { wrapper: test.wrapper });

  fireEvent.click(screen.getByRole("button", { name: "Zamknij okno" }));
  expect(screen.queryByText("Pierwsza")).not.toBeInTheDocument();
  expect(useNotificationsStore.getState().notifications).toHaveLength(2);

  // The next presented notification reopens the window.
  act(() => useWindowsStore.getState().setOpen("notifications", true));
  expect(screen.getByText("Pierwsza")).toBeVisible();
  expect(screen.getByText("Druga")).toBeVisible();

  fireEvent.click(
    screen.getByRole("button", { name: "Wyczyść wszystkie powiadomienia" }),
  );
  expect(useNotificationsStore.getState().notifications).toEqual([]);
  expect(screen.queryByText("Pierwsza")).not.toBeInTheDocument();
});

it("marks the notifications as not current while the connection is down", async () => {
  render(<Notifications />, { wrapper: test.wrapper });
  test.open();
  // Joining without an access policy clears notifications, so they arrive after it.
  await test.join();
  act(seedOpenWindow);
  vi.useFakeTimers();

  act(() => test.wire.close());
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(0));

  expect(
    screen.getByText("Połączenie przerwane, ponowne łączenie…"),
  ).toBeVisible();
  expect(screen.getByText("Pierwsza")).toBeVisible();
});
