import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsList } from "./notifications-list";
import {
  type StoredNotification,
  useNotificationsStore,
} from "@/store/notifications.store";

const mockSingleNotification = vi.fn();

vi.mock("@/hooks/api/use-guilds", () => ({
  useGuilds: () => ({
    data: [
      { id: "guild-1", name: "Alpha", icon: null },
      { id: "guild-2", name: "Beta", icon: null },
    ],
  }),
  getGuildNamesById: (guilds?: Array<{ id: string; name: string }>) =>
    guilds?.reduce<Record<string, string>>((result, guild) => {
      result[guild.id] = guild.name;
      return result;
    }, {}) ?? {},
}));

vi.mock("@/features/notifications/components/single-notification", () => ({
  SingleNotification: ({
    notification,
    guildNamesById,
    showCloseButton,
  }: {
    notification: StoredNotification;
    guildNamesById: Record<string, string>;
    showCloseButton: boolean;
  }) => {
    mockSingleNotification({ notification, guildNamesById, showCloseButton });

    return (
      <div data-testid={`notification-${notification.listKey}`}>
        {notification.notificationId}:{showCloseButton ? "closable" : "single"}
      </div>
    );
  },
}));

const createStoredNotification = (
  overrides?: Partial<StoredNotification>,
): StoredNotification => ({
  notificationId: "notification-1",
  discordId: "discord-1",
  guildId: "guild-1",
  world: "pandora",
  createdAt: "2026-04-19T10:00:00.000Z",
  message: "Hej",
  servers: ["guild-1"],
  listKey: "notification-1",
  receivedAtMs: Date.now(),
  ...overrides,
});

describe("NotificationsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationsStore.setState({
      notifications: [],
      notificationAutoHideByListKey: {},
      latestNotificationAnimationCycle: 0,
    });
  });

  it("renders notifications with guild names and close button visibility based on list length", () => {
    const firstNotification = createStoredNotification();
    const secondNotification = createStoredNotification({
      notificationId: "notification-2",
      listKey: "notification-2",
      guildId: "guild-2",
    });

    render(
      <NotificationsList
        notifications={[firstNotification, secondNotification]}
      />,
    );

    expect(
      screen.getByTestId(`notification-${firstNotification.listKey}`),
    ).toHaveTextContent("notification-1:closable");
    expect(
      screen.getByTestId(`notification-${secondNotification.listKey}`),
    ).toHaveTextContent("notification-2:closable");
    expect(mockSingleNotification).toHaveBeenNthCalledWith(1, {
      notification: firstNotification,
      guildNamesById: { "guild-1": "Alpha", "guild-2": "Beta" },
      showCloseButton: true,
    });
  });

  it("does not scroll on mount when there is no animation cycle", () => {
    render(<NotificationsList notifications={[createStoredNotification()]} />);

    const viewport = document.querySelector(
      "[data-radix-scroll-area-viewport]",
    );

    if (!(viewport instanceof HTMLDivElement)) {
      throw new Error("Expected scroll viewport");
    }

    const scrollToSpy = vi.fn();
    Object.defineProperty(viewport, "scrollTo", {
      configurable: true,
      value: scrollToSpy,
    });

    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("scrolls the viewport to the top when a new animation cycle appears", async () => {
    render(<NotificationsList notifications={[createStoredNotification()]} />);

    const viewport = document.querySelector(
      "[data-radix-scroll-area-viewport]",
    );

    if (!(viewport instanceof HTMLDivElement)) {
      throw new Error("Expected scroll viewport");
    }

    const scrollToSpy = vi.fn();
    Object.defineProperty(viewport, "scrollTo", {
      configurable: true,
      value: scrollToSpy,
    });

    useNotificationsStore.setState({
      latestNotificationAnimationCycle: 2,
    });

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth",
      });
    });
  });
});
