import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RealtimeClient,
  type BasicPresence,
  type ServerEvent,
} from "@lootlog/client/realtime";
import { GatewayEvent } from "@/config/gateway";
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

    for (const [event, field] of [
      [GatewayEvent.MEMBER_WEB_PRESENCE_FETCH, "sessions"],
      [GatewayEvent.EVENT_PRESENCE_FETCH, "players"],
      [GatewayEvent.ONLINE_PLAYERS_PRESENCE_FETCH, "players"],
    ] as const) {
      const acknowledgement = vi.fn();
      client.emit(event, { guildId: "organization-1" }, acknowledgement);
      await vi.waitFor(() => expect(acknowledgement).toHaveBeenCalledOnce());
      expect(request).toHaveBeenLastCalledWith("presence.fetch", {
        organizationId: "organization-1",
        world: undefined,
        delivery: "response",
      });
      expect(acknowledgement.mock.calls[0]?.[0]).toEqual({
        status: "success",
        [field]: {
          "discord-member": [
            expect.objectContaining({ sessionId: "session-1" }),
          ],
        },
      });
    }
  });

  it("ignores legacy snapshots and preserves Discord identity through live updates", () => {
    const subscribe = vi.spyOn(RealtimeClient.prototype, "subscribe");
    const client = new GatewayClient();
    const deliver = subscribe.mock.calls[0]?.[0];
    const webUpdates = vi.fn();
    const gameUpdates = vi.fn();
    client.on(GatewayEvent.MEMBER_WEB_PRESENCE_UPDATE, webUpdates);
    client.on(GatewayEvent.EVENT_PRESENCE_UPDATE, gameUpdates);

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
  client.on(GatewayEvent.KILLS_CHANGED, handler);
  deliver?.({
    v: 1,
    type: "kills.changed",
    data: { guildId: "organization-1" },
  });
  expect(handler).toHaveBeenCalledWith({ guildId: "organization-1" });
});

it("delivers complete feed entries without turning them into loot invalidation signals", () => {
  const subscribe = vi.spyOn(RealtimeClient.prototype, "subscribe");
  const client = new GatewayClient();
  const deliver = subscribe.mock.calls[0]?.[0];
  const entryHandler = vi.fn();
  const lootHandler = vi.fn();
  client.on(GatewayEvent.FEED_ENTRY, entryHandler);
  client.on(GatewayEvent.LOOTS_CREATE, lootHandler);

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

it("lets the provider join once after a deferred reconnect notification", async () => {
  const { decodeRealtimeFrame, encodeRealtimeFrame } =
    await import("@lootlog/protocol/realtime/codec");

  const wires: Array<{ open: () => void; close: () => void }> = [];
  const joins: unknown[] = [];

  class Wire {
    binaryType: BinaryType = "arraybuffer";
    readyState = 1;
    private readonly listeners = new Map<
      string,
      (event: { data?: unknown }) => void
    >();
    constructor() {
      wires.push({
        open: () => this.listeners.get("open")?.({}),
        close: () => this.close(),
      });
    }
    addEventListener(
      type: string,
      listener: (event: { data?: unknown }) => void,
    ) {
      this.listeners.set(type, listener);
    }
    close() {
      this.listeners.get("close")?.({});
    }
    send(bytes: Uint8Array) {
      const command = decodeRealtimeFrame(bytes);

      if (!("requestId" in command) || !command.requestId)
        throw new Error("Expected request");

      if ("type" in command && command.type === "session.join")
        joins.push(command.data);

      const response = encodeRealtimeFrame({
        v: 1,
        requestId: command.requestId,
        status: "success",
        data: {},
      });

      queueMicrotask(() => this.listeners.get("message")?.({ data: response }));
    }
  }

  vi.stubGlobal("WebSocket", Wire);
  const client = new GatewayClient();
  client.on(GatewayEvent.CONNECT, () =>
    queueMicrotask(() => client.emit(GatewayEvent.JOIN, {})),
  );

  try {
    client.connect();
    wires[0]?.open();
    await vi.waitFor(() => expect(joins).toHaveLength(1));
    wires[0]?.close();
    client.connect();
    wires[1]?.open();
    await Promise.resolve();
    await vi.waitFor(() => expect(joins).toHaveLength(2));
  } finally {
    client.disconnect();
    vi.unstubAllGlobals();
  }
});
