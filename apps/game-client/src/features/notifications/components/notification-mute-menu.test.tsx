import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationMuteMenu } from "@/features/notifications/components/notification-mute-menu";
import type { StoredNotification } from "@/store/notifications.store";

const mockUpdateMutes = vi.fn();

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
    mockUpdateMutes.mockReset();
  });

  it("disables mute actions until notification mutes are loaded", () => {
    render(
      <NotificationMuteMenu
        notification={notification}
        senderName="Tester"
        isReady={false}
        isPending={false}
        mutes={{
          players: [],
          npcs: [],
        }}
        onUpdateMutes={mockUpdateMutes}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Opcje wyciszenia",
      }),
    ).toBeDisabled();
  });

  it("uses the fetched mute list when muting a player", async () => {
    const user = userEvent.setup();

    render(
      <NotificationMuteMenu
        notification={notification}
        senderName="Tester"
        isReady
        isPending={false}
        mutes={{
          players: [
            {
              discordId: "discord-existing",
              displayName: "Istniejacy",
            },
          ],
          npcs: [],
        }}
        onUpdateMutes={mockUpdateMutes}
      />,
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

    expect(mockUpdateMutes).toHaveBeenCalledWith({
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
    });
  });
});
