import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import {
  RealtimeClient,
  type BasicPresence,
  type ServerEvent,
} from "@lootlog/client/realtime";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { GatewayClient } from "./gateway-client";

const presence: BasicPresence = {
  userId: "internal-user",
  discordId: "discord-member",
  sessionId: "session-1",
  organizationIds: ["organization-1"],
  platform: "web-app",
  status: "online",
  confidence: "reported",
  isAfk: false,
  lastSeen: 1,
};

afterEach(() => vi.restoreAllMocks());

describe("gateway presence identity", () => {
  it("keys fetched web and game presence by Discord identity", async () => {
    const request = vi
      .spyOn(RealtimeClient.prototype, "request")
      .mockResolvedValue({
        organizationId: "organization-1",
        revision: 1,
        presences: [
          presence,
          {
            ...presence,
            platform: "game",
            character: {
              world: "alpha",
              name: "Hero",
              lvl: 100,
              icon: "hero.gif",
              characterId: "10",
              accountId: "20",
              prof: "w",
            },
          },
        ],
      });

    const client = new GatewayClient();

    const response = await client.fetchPresence("organization-1");

    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith("presence.fetch", {
      organizationId: "organization-1",
      delivery: "response",
    });
    expect(response).toEqual({
      status: "success",
      sessions: {
        "discord-member": [expect.objectContaining({ sessionId: "session-1" })],
      },
      players: {
        "discord-member": [expect.objectContaining({ sessionId: "session-1" })],
      },
    });
  });

  it("ignores legacy snapshots and preserves Discord identity through live updates", () => {
    const subscribe = vi.spyOn(RealtimeClient.prototype, "subscribe");
    const client = new GatewayClient();
    const deliver = subscribe.mock.calls[0]?.[0];
    const webUpdates = vi.fn();
    const gameUpdates = vi.fn();
    client.on("web-presence.changed", webUpdates);
    client.on("game-presence.changed", gameUpdates);

    deliver?.({
      v: 1,
      type: "presence.snapshot",
      data: {
        organizationId: "organization-1",
        revision: 1,
        presences: [presence, { ...presence, platform: "game" }],
      },
    });
    expect(webUpdates).not.toHaveBeenCalled();
    expect(gameUpdates).not.toHaveBeenCalled();

    const events: ServerEvent[] = [
      {
        v: 1,
        type: "presence.delta",
        data: {
          organizationId: "organization-1",
          revision: 1,
          changes: [{ action: "upsert", presence }],
        },
      },
      {
        v: 1,
        type: "presence.delta",
        data: {
          organizationId: "organization-1",
          revision: 1,
          changes: [
            { action: "upsert", presence: { ...presence, platform: "game" } },
          ],
        },
      },
      {
        v: 1,
        type: "presence.delta",
        data: {
          organizationId: "organization-1",
          revision: 1,
          changes: [
            {
              action: "remove",
              userId: presence.userId,
              discordId: presence.discordId,
              sessionId: presence.sessionId,
            },
          ],
        },
      },
    ];

    for (const event of events) deliver?.(event);

    for (const updates of [webUpdates, gameUpdates]) {
      expect(updates).toHaveBeenCalledTimes(2);
      expect(updates).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          discordId: "discord-member",
          status: "online",
        }),
      );
      expect(updates).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          discordId: "discord-member",
          status: "offline",
        }),
      );
    }
  });
});

it("adapts kill invalidation signals without adding an actor or NPC identity", () => {
  const subscribe = vi.spyOn(RealtimeClient.prototype, "subscribe");
  const client = new GatewayClient();
  const deliver = subscribe.mock.calls[0]?.[0];
  const handler = vi.fn();
  client.on("kill-stats.changed", handler);
  deliver?.({ v: 1, type: "kill-stats.changed", data: {} });
  expect(handler).toHaveBeenCalledWith({});
});

it("delivers complete feed entries without turning them into loot invalidation signals", () => {
  const subscribe = vi.spyOn(RealtimeClient.prototype, "subscribe");
  const client = new GatewayClient();
  const deliver = subscribe.mock.calls[0]?.[0];
  const entryHandler = vi.fn();
  const lootHandler = vi.fn();
  client.on("feed.entry", entryHandler);
  client.on("loot.created", lootHandler);

  const entry = {
    id: "kill:organization-1:world:1:minute",
    version: 2,
    type: "kill" as const,
    count: 2,
    occurredAt: "2026-09-06T12:00:00Z",
    world: "world",
    guild: { id: "organization-1", name: "Organization", vanityUrl: null },
    npc: { id: 1, name: "Hero", type: "HERO", lvl: 100, icon: null },
  };

  deliver?.({ v: 1, type: "feed.entry", data: entry });
  expect(entryHandler).toHaveBeenCalledWith(entry);
  expect(lootHandler).not.toHaveBeenCalled();
});

it("treats the first access policy as the page's baseline and reports later revocations", () => {
  vi.spyOn(RealtimeClient.prototype, "request").mockResolvedValue(undefined);
  const subscribe = vi.spyOn(RealtimeClient.prototype, "subscribe");
  const client = new GatewayClient();
  const deliver = subscribe.mock.calls[0]?.[0];
  const handler = vi.fn();
  client.on("join", handler);

  const joined = (permissions: Permission[]) =>
    deliver?.({
      v: 1,
      type: "session.joined",
      data: {
        connectionId: "connection-1",
        organizationIds: ["organization-1"],
        subscriptionScopes: [],
        accessPolicy: createAccessPolicySnapshot(
          [
            {
              guild: { id: "organization-1", ownerId: "owner" },
              roles: [{ permissions, lvlRangeFrom: 0, lvlRangeTo: 500 }],
            },
          ],
          "discord-member",
        ),
      },
    });

  // Reporting the first join as unknown made every page load reset its data.
  joined([Permission.LOOTLOG_LOOTS_READ]);
  expect(handler).toHaveBeenLastCalledWith(
    expect.objectContaining({ accessPolicyChanges: [] }),
  );

  joined([]);
  expect(handler).toHaveBeenLastCalledWith(
    expect.objectContaining({
      accessPolicyChanges: [
        expect.objectContaining({
          organizationId: "organization-1",
          restricted: true,
        }),
      ],
    }),
  );
});

it("keeps a permissions update without a baseline unknown so stale caches are cleared", () => {
  const subscribe = vi.spyOn(RealtimeClient.prototype, "subscribe");
  const client = new GatewayClient();
  const deliver = subscribe.mock.calls[0]?.[0];
  const handler = vi.fn();
  client.on("access.updated", handler);

  // The gateway sends this before rejecting a join that lost every Organization.
  deliver?.({
    v: 1,
    type: "permissions.updated",
    data: {
      changes: [],
      organizationIds: [],
      subscriptionScopes: [],
      accessPolicy: createAccessPolicySnapshot([], "discord-member"),
    },
  });
  expect(handler).toHaveBeenLastCalledWith(
    expect.objectContaining({ accessPolicyChanges: undefined }),
  );
});

it.each([
  { joins: 1, delay: 200, recover: false },
  { joins: 1, delay: 5_000, recover: true },
  { joins: 2, delay: 200, recover: true },
])(
  "asks listeners to recover after join $joins arriving $delay ms after connecting: $recover",
  ({ joins, delay, recover }) => {
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });
    vi.spyOn(RealtimeClient.prototype, "connect").mockReturnValue(undefined);
    vi.spyOn(RealtimeClient.prototype, "request").mockResolvedValue(undefined);
    const subscribe = vi.spyOn(RealtimeClient.prototype, "subscribe");
    const client = new GatewayClient();
    const deliver = subscribe.mock.calls[0]?.[0];
    const handler = vi.fn();
    client.on("join", handler);
    client.connect();
    vi.advanceTimersByTime(delay);

    for (let join = 0; join < joins; join++)
      deliver?.({
        v: 1,
        type: "session.joined",
        data: {
          connectionId: "connection-1",
          organizationIds: ["organization-1"],
          subscriptionScopes: [],
          accessPolicy: createAccessPolicySnapshot([], "discord-member"),
        },
      });

    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({ recover }),
    );
  },
);
