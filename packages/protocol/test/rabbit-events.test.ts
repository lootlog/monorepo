import { describe, expect, it } from "bun:test";
import {
  decodeRabbitEvent,
  decodeRabbitEventJson,
} from "../src/rabbit/events.js";
import { RabbitRoutingKey } from "../src/rabbit/topology.js";

describe("decodeRabbitEvent", () => {
  for (const routingKey of [
    RabbitRoutingKey.GUILDS_CREATE,
    RabbitRoutingKey.GUILDS_UPDATE,
  ]) {
    it.each([null, "https://cdn.discordapp.com/icons/guild/icon.webp"])(
      `${routingKey} preserves Discord icon %j`,
      (icon) => {
        const payload = {
          guildId: "guild-1",
          name: "testowankox",
          icon,
          ownerId: "user-1",
          ...(routingKey === RabbitRoutingKey.GUILDS_CREATE
            ? { roles: [] }
            : {}),
        };
        expect(
          decodeRabbitEventJson(routingKey, JSON.stringify(payload)),
        ).toEqual(payload);
      },
    );

    it.each([undefined, 123, {}, []].map((icon) => ({ icon })))(
      `${routingKey} rejects a missing or malformed icon %j`,
      ({ icon }) => {
        expect(() =>
          decodeRabbitEventJson(
            routingKey,
            JSON.stringify({
              guildId: "guild-1",
              name: "Lootlog",
              icon,
              ownerId: "user-1",
              roles: [],
            }),
          ),
        ).toThrow();
      },
    );
  }

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

  it("rejects channel deletion with an incomplete sync state before it reaches the API", () => {
    expect(() =>
      decodeRabbitEventJson(
        RabbitRoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
        JSON.stringify({
          guildId: "guild-1",
          channelId: "channel-1",
          syncState: {},
        }),
      ),
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
