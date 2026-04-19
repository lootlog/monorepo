import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SingleNotificationMessage } from "./single-notification-message";

describe("SingleNotificationMessage", () => {
  it("renders the notification message text", () => {
    render(
      <SingleNotificationMessage
        notification={
          {
            notificationId: "message-1",
            discordId: "discord-1",
            guildId: "guild-1",
            world: "pandora",
            createdAt: "2026-04-19T10:00:00.000Z",
            message: "To jest wiadomość",
            servers: ["guild-1"],
          } as never
        }
      />,
    );

    expect(screen.getByText("To jest wiadomość")).toBeInTheDocument();
  });
});
