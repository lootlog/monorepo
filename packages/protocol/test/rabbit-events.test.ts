import { describe, expect, it } from "bun:test";
import {
  decodeRabbitEvent,
  decodeRabbitEventJson,
} from "../src/rabbit/events.js";
import { RabbitRoutingKey } from "../src/rabbit/topology.js";

describe("decodeRabbitEvent", () => {
  it("decodes a valid guild lifecycle event", () => {
    expect(
      decodeRabbitEvent(RabbitRoutingKey.GUILDS_CREATE, {
        guildId: "guild-1",
        name: "Lootlog",
        icon: "icon",
        ownerId: "user-1",
        roles: [],
      }),
    ).toEqual({
      guildId: "guild-1",
      name: "Lootlog",
      icon: "icon",
      ownerId: "user-1",
      roles: [],
    });
  });

  it("rejects a guild lifecycle event without its organization boundary", () => {
    expect(() =>
      decodeRabbitEvent(RabbitRoutingKey.GUILDS_CREATE, {
        name: "Lootlog",
        icon: "icon",
        ownerId: "user-1",
        roles: [],
      }),
    ).toThrow();
  });

  it("rejects invalid member rebalance identifiers", () => {
    expect(() =>
      decodeRabbitEvent(RabbitRoutingKey.GUILDS_MEMBERS_UPDATE, {
        guildId: "guild-1",
        discordId: 123,
        userId: "user-1",
      }),
    ).toThrow();
  });

  it("rejects a malformed presence check before it reaches a consumer", () => {
    expect(() =>
      decodeRabbitEvent(RabbitRoutingKey.PRESENCE_CHECK_REQUEST, {
        guildId: "guild-1",
        mapName: "",
      }),
    ).toThrow();
  });

  it("rejects malformed JSON before schema validation", () => {
    expect(() =>
      decodeRabbitEventJson(RabbitRoutingKey.GUILDS_DELETE, "not-json"),
    ).toThrow();
  });
});
