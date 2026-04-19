import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SingleNotificationPartyGathering } from "./single-notification-party-gathering";

describe("SingleNotificationPartyGathering", () => {
  it("renders party gathering details with description and matching level range", () => {
    render(
      <SingleNotificationPartyGathering
        notification={{
          notificationId: "party-1",
          guildId: "guild-1",
          discordId: "discord-1",
          world: "pandora",
          createdAt: "2026-04-19T10:00:00.000Z",
          servers: ["guild-1"],
          type: "party-gathering",
          character: {
            nick: "Tester",
            lvl: 240,
            prof: "w",
            characterId: "101",
            accountId: "202",
            icon: "hero.gif",
          },
          description: "Brakuje tanka",
          minLvl: 200,
          maxLvl: 260,
        }}
        meetsLevelReq
      />,
    );

    expect(screen.getByText("Tester")).toBeInTheDocument();
    expect(screen.getByText("(240w)")).toBeInTheDocument();
    expect(screen.getByText("Szuka grupy")).toBeInTheDocument();
    expect(screen.getByText('"Brakuje tanka"')).toBeInTheDocument();
    expect(screen.getByText("Poziom: 200 - 260")).toHaveClass(
      "ll:text-gray-300",
    );
  });

  it("shows the level range as failing when the character does not meet requirements", () => {
    render(
      <SingleNotificationPartyGathering
        notification={{
          notificationId: "party-1",
          guildId: "guild-1",
          discordId: "discord-1",
          world: "pandora",
          createdAt: "2026-04-19T10:00:00.000Z",
          servers: ["guild-1"],
          type: "party-gathering",
          character: {
            nick: "Tester",
            lvl: 240,
            prof: "w",
            characterId: "101",
            accountId: "202",
            icon: "hero.gif",
          },
          minLvl: 260,
          maxLvl: 280,
        }}
        meetsLevelReq={false}
      />,
    );

    expect(screen.getByText("Poziom: 260 - 280")).toHaveClass(
      "ll:text-red-300",
    );
  });
});
