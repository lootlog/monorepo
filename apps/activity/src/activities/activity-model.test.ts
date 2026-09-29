import { describe, expect, it } from "bun:test";
import {
  decodeCreateActivity,
  decodeGuildMemberRemoved,
} from "./activity-model.js";

describe("activity wire schemas", () => {
  it("accepts the deployed GAME activity shape", () => {
    const value = decodeCreateActivity({
      userId: "user",
      guildId: "guild",
      discordId: "discord",
      type: "CONNECT_EVENT",
      source: "GAME",
      idempotencyKey: "key",
      details: { sessionId: "session" },
      actorSnapshot: {
        accountId: 1,
        characterId: 2,
        clanName: "Clan",
        clanId: 3,
        icon: "warrior.gif",
        lvl: 100,
        prof: "w",
      },
    });

    expect(value.guildId).toBe("guild");
  });

  it("rejects a GAME activity without its actor projection", () => {
    expect(() =>
      decodeCreateActivity({
        userId: "user",
        guildId: "guild",
        discordId: "discord",
        type: "CONNECT_EVENT",
        source: "GAME",
        idempotencyKey: "key",
        details: { sessionId: "session" },
      }),
    ).toThrow();
  });

  it("decodes guild member removal", () => {
    expect(
      decodeGuildMemberRemoved({ guildId: "guild", discordId: "discord" }),
    ).toEqual({ guildId: "guild", discordId: "discord" });
  });
});
