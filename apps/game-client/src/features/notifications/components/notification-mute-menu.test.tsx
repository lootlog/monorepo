import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationMuteMenu } from "@/features/notifications/components/notification-mute-menu";
import type { StoredNotification } from "@/store/notifications.store";

const mockUseCurrentUserNotificationMutes = vi.fn();
const mockUseUpdateUserPreferences = vi.fn();
const mockMutate = vi.fn();

vi.mock("@/hooks/use-current-user-notification-mutes", () => ({
  useCurrentUserNotificationMutes: () => mockUseCurrentUserNotificationMutes(),
}));

vi.mock("@/hooks/api/use-user-preferences", () => ({
  useUpdateUserPreferences: () => mockUseUpdateUserPreferences(),
}));

const notification: StoredNotification = {
  notificationId: "notif-1",
  discordId: "discord-1",
  guildId: "guild-1",
  world: "pandora",
  createdAt: "2026-04-17T10:00:00.000Z",
  message: "Hej",
  servers: ["guild-1"],
  listKey: "notif-1",
  receivedAtMs: Date.now(),
};

describe("NotificationMuteMenu", () => {
  beforeEach(() => {
    mockMutate.mockReset();
    mockUseUpdateUserPreferences.mockReset();
    mockUseUpdateUserPreferences.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
    mockUseCurrentUserNotificationMutes.mockReset();
  });

  it("disables mute actions until notification mutes are loaded", () => {
    mockUseCurrentUserNotificationMutes.mockReturnValue({
      isReady: false,
      mutes: {
        players: [],
        npcs: [],
      },
    });

    render(
      <NotificationMuteMenu notification={notification} senderName="Tester" />,
    );

    expect(
      screen.getByRole("button", {
        name: "Opcje wyciszenia",
      }),
    ).toBeDisabled();
  });

  it("uses the fetched mute list when muting a player", async () => {
    const user = userEvent.setup();

    mockUseCurrentUserNotificationMutes.mockReturnValue({
      isReady: true,
      mutes: {
        players: [
          {
            discordId: "discord-existing",
            displayName: "Istniejacy",
          },
        ],
        npcs: [],
      },
    });

    render(
      <NotificationMuteMenu notification={notification} senderName="Tester" />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Opcje wyciszenia",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Nie otrzymuj powiadomień od tego gracza",
      }),
    );

    expect(mockMutate).toHaveBeenCalledWith({
      mutes: {
        players: [
          {
            discordId: "discord-existing",
            displayName: "Istniejacy",
          },
          {
            discordId: "discord-1",
            displayName: "Tester",
          },
        ],
      },
    });
  });
});
