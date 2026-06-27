import { describe, expect, it } from "vitest";
import { normalizePresence } from "./online-players-presence";

describe("online players presence", () => {
  it("preserves Margonem verification from player presence payloads", () => {
    expect(
      normalizePresence({
        discordId: "discord-1",
        guildId: "guild-1",
        playerPresence: {
          world: "alpha",
          name: "Hero",
          lvl: "100",
          icon: "icon",
          characterId: "10",
          accountId: "20",
          prof: "w",
          sessionId: "session-1",
          margonemAccountVerified: true,
        },
      }),
    ).toEqual(
      expect.objectContaining({
        discordId: "discord-1",
        margonemAccountVerified: true,
        player: expect.objectContaining({
          characterId: "10",
          accountId: "20",
        }),
      }),
    );
  });
});
