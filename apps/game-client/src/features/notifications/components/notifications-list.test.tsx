import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "@/store/settings.store";
import type { StoredNotification } from "@/store/notifications.store";
import { NotificationsList } from "./notifications-list";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => (
    <div data-testid="animate-presence">{children}</div>
  ),
  motion: {
    div: ({ children }: { children: ReactNode }) => (
      <div data-testid="motion-div">{children}</div>
    ),
  },
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

vi.mock("@/features/notifications/components/single-notification", () => ({
  SingleNotification: ({
    notification,
  }: {
    notification: StoredNotification;
  }) => <div data-testid="single-notification">{notification.listKey}</div>,
}));

vi.mock("@/lib/api/generated-helpers", () => ({
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

describe("NotificationsList", () => {
  afterEach(() => {
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
  });

  it("renders framer motion wrappers when animation effects are enabled", () => {
    useSettingsStore.setState({ animationEffectsEnabled: true });

    render(<NotificationsList notifications={[notification]} />);

    expect(screen.getAllByTestId("motion-div").length).toBeGreaterThan(0);
    expect(screen.getByTestId("single-notification")).toBeInTheDocument();
  });

  it("renders without framer motion wrappers when animation effects are disabled", () => {
    useSettingsStore.setState({ animationEffectsEnabled: false });

    render(<NotificationsList notifications={[notification]} />);

    expect(screen.queryByTestId("motion-div")).not.toBeInTheDocument();
    expect(screen.queryByTestId("animate-presence")).not.toBeInTheDocument();
    expect(screen.getByTestId("single-notification")).toBeInTheDocument();
  });
});
