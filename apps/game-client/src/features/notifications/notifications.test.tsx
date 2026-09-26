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

it("clears notifications when the window closes", () => {
  seedOpenWindow();
  render(<Notifications />, { wrapper: test.wrapper });

  fireEvent.click(screen.getByRole("button", { name: "Zamknij okno" }));

  expect(useNotificationsStore.getState().notifications).toEqual([]);
  act(() => useWindowsStore.getState().setOpen("notifications", true));
  expect(screen.queryByText("Pierwsza")).not.toBeInTheDocument();
});
