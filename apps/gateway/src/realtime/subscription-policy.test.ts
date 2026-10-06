import { describe, expect, test } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { canReadPreciseLocation, canSubscribe } from "./subscription-policy.js";
import type { SessionData } from "./session.js";

const makeSession = (permissions: Permission[]): SessionData => ({
  discordId: "discord-1",
  userId: "user-1",
  connectionId: "connection-1",
  platform: "web-app",
  joined: true,
  guilds: [
    {
      guild: { id: "organization-1", ownerId: "owner" },
      roles: [{ id: "role", lvlRangeFrom: 0, lvlRangeTo: 500, permissions }],
    },
  ],
  subscriptions: new Map(),
  airTagScopes: [],
  confidence: "reported",
});

describe("logical subscription policy", () => {
  test("does not accept an organization identifier as an implicit room name", () => {
    const viewer = makeSession([Permission.LOOTLOG_CHAT_READ]);
    expect(
      canSubscribe(viewer, {
        topic: "organization.chat",
        organizationId: "organization-1:admin",
      }),
    ).toBe(false);
  });

  test("rebalances basic and precise presence capabilities independently", () => {
    const basic = makeSession([Permission.LOOTLOG_ONLINE_PLAYERS_READ]);

    const precise = makeSession([
      Permission.LOOTLOG_ONLINE_PLAYERS_READ,
      Permission.LOOTLOG_PRESENCE_LOCATION_READ,
    ]);

    const scope = {
      topic: "organization.presence",
      organizationId: "organization-1",
    } as const;

    expect(canSubscribe(basic, scope)).toBe(true);
    expect(canReadPreciseLocation(basic, "organization-1")).toBe(false);
    expect(canReadPreciseLocation(precise, "organization-1")).toBe(true);
  });

  test("admits one world's global chat only to clients that know channels", () => {
    const member = makeSession([]);

    const channels = {
      ...member,
      supportsGlobalChat: true,
      supportsGlobalChatChannels: true,
    };

    const legacy = { ...member, supportsGlobalChat: true };
    const world = { topic: "global.chat.world", world: "gordion" } as const;

    expect(canSubscribe(channels, world)).toBe(true);
    expect(canSubscribe(channels, { topic: "global.chat" })).toBe(true);
    expect(canSubscribe(legacy, { topic: "global.chat" })).toBe(true);
    // A legacy client would close the socket on moderation events.
    expect(canSubscribe(legacy, world)).toBe(false);
    // Without a world, the scope would match every world's channel.
    expect(canSubscribe(channels, { topic: "global.chat.world" })).toBe(false);
    expect(canSubscribe({ ...channels, guilds: [] }, world)).toBe(false);
  });
});
