import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SingleNotificationNpc } from "./single-notification-npc";

describe("SingleNotificationNpc", () => {
  it("renders npc details and the gathering badge", () => {
    render(
      <SingleNotificationNpc
        notification={
          {
            notificationId: "npc-1",
            discordId: "discord-1",
            guildId: "guild-1",
            world: "pandora",
            createdAt: "2026-04-19T10:00:00.000Z",
            servers: ["guild-1"],
            isGatheringParty: true,
            npc: {
              id: 500,
              name: "Orla",
              nick: "Orla",
              x: 10,
              y: 20,
              tpl: 900,
              icon: "npc.gif",
              prof: "m",
              wt: 80,
              lvl: 230,
              type: 3,
              location: "Ithan",
            },
          } as never
        }
      />,
    );

    expect(screen.getByText("Orla")).toBeInTheDocument();
    expect(screen.getByText("(230m)")).toBeInTheDocument();
    expect(screen.getByText("Ithan")).toBeInTheDocument();
    expect(screen.getByText("(10, 20)")).toBeInTheDocument();
    expect(screen.getByText("Zbiera grupę")).toBeInTheDocument();
  });

  it("returns null when there is no npc payload", () => {
    const { container } = render(
      <SingleNotificationNpc
        notification={
          {
            notificationId: "message-1",
            discordId: "discord-1",
            guildId: "guild-1",
            world: "pandora",
            createdAt: "2026-04-19T10:00:00.000Z",
            message: "Hej",
            servers: ["guild-1"],
          } as never
        }
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
