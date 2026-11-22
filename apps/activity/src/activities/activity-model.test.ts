import { describe, expect, it } from "bun:test";
import { decodeCreateActivity } from "./activity-model.js";

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
        name: "Hero",
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

  it("rejects an actor snapshot the activity log cannot store", () => {
    expect(() =>
      decodeCreateActivity({
        userId: "user",
        guildId: "guild",
        discordId: "discord",
        type: "CONNECT_EVENT",
        source: "WEB_APP",
        idempotencyKey: "key",
        details: { sessionId: "session" },
        actorSnapshot: { accountId: 1, characterId: 2, name: "Hero" },
      }),
    ).toThrow();
  });
});
