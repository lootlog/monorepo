import {
  canReadPolicyNpc,
  createAccessPolicySnapshot,
} from "@lootlog/protocol/realtime/access-policy";
import { describe, expect, test } from "bun:test";
import { encode } from "@msgpack/msgpack";
import { Permission } from "@lootlog/schema/permissions";
import { Effect } from "effect";
import { CommandHandler } from "./command-handler.js";
import { canReadSourceEvent } from "./source-event-visibility.js";
import {
  decodeServerEvent,
  type ServerEvent,
} from "@lootlog/protocol/realtime";
import type { GuildStore } from "#src/guilds/guild-store";
import type { MargonemProofVerifier } from "#src/auth/margonem-proof";
import type { ActivityPublisher } from "#src/rabbit/activity-publisher";
import type { AirTagService } from "#src/realtime/air-tag-service";
import type { MapPingService } from "#src/realtime/map-ping-service";
import type { PresenceStore } from "#src/realtime/presence-store";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket, SessionData } from "#src/realtime/session";
import type { UserGuildData } from "#src/guilds/guild";

const guild = (
  permissions: Permission[] = [Permission.LOOTLOG_ONLINE_PLAYERS_READ],
): UserGuildData => ({
  guild: { id: "organization-1", ownerId: "owner" },
  roles: [{ id: "role", lvlRangeFrom: 0, lvlRangeTo: 500, permissions }],
});

class FakeGuildStore {
  guilds: UserGuildData[] = [guild()];
  getUserGuilds(): Effect.Effect<UserGuildData[], unknown> {
    return Effect.succeed(this.guilds);
  }
  invalidate(): Effect.Effect<void> {
    return Effect.void;
  }
}

class FakeHub {
  readonly deliveryOrder: string[] = [];
  readonly responses: unknown[] = [];
  readonly events: unknown[] = [];
  readonly sockets: GatewaySocket[] = [];
  onPermissionRebalance(): void {}
  publishPermissionRebalance(): Effect.Effect<void> {
    return Effect.void;
  }
  sendResponse(_socket: GatewaySocket, response: unknown): boolean {
    this.deliveryOrder.push("response");
    this.responses.push(response);
    return true;
  }
  sendEvent(_socket: GatewaySocket, event: unknown): boolean {
    this.deliveryOrder.push("event");
    this.events.push(event);
    return true;
  }
  replaceSubscriptions(
    socket: GatewaySocket,
    scopes: ReadonlyArray<{ topic: string }>,
  ): void {
    socket.data.subscriptions = new Map(
      scopes.map((scope, index) => [String(index), scope]),
    ) as SessionData["subscriptions"];
  }
  getLocalSocketsForUser(userId: string): GatewaySocket[] {
    return this.sockets.filter((socket) => socket.data.userId === userId);
  }
}

class FakeActivity {
  readonly calls: Array<{ type: string; ids?: ReadonlyArray<string> }> = [];
  publish(
    type: "CONNECT_EVENT" | "DISCONNECT_EVENT",
    _session: SessionData,
    ids?: ReadonlyArray<string>,
  ): Effect.Effect<void> {
    return Effect.sync(() => this.calls.push({ type, ids })).pipe(
      Effect.asVoid,
    );
  }
}

class FakePresence {
  readonly reconciled: GatewaySocket[] = [];

  reconcileAccess(socket: GatewaySocket): Effect.Effect<void> {
    return Effect.sync(() => {
      this.reconciled.push(socket);
      const allowedIds = new Set(
        socket.data.guilds.map(({ guild: currentGuild }) => currentGuild.id),
      );
      const current = socket.data.presence;
      if (!current) return;
      const organizationIds = current.organizationIds.filter((id) =>
        allowedIds.has(id),
      );
      socket.data.presence =
        organizationIds.length === 0
          ? undefined
          : { ...current, organizationIds };
    });
  }
}

const makeSocket = (): { socket: GatewaySocket; closes: number[] } => {
  const closes: number[] = [];
  const data: SessionData = {
    discordId: "discord-1",
    userId: "user-1",
    connectionId: "connection-1",
    platform: "web-app",
    joined: false,
    guilds: [],
    subscriptions: new Map(),
    airTagScopes: [],
    confidence: "reported",
    backpressureStrikes: 0,
  };
  return {
    socket: {
      data,
      close: (code: number) => closes.push(code),
    } as unknown as GatewaySocket,
    closes,
  };
};

const setup = () => {
  const guilds = new FakeGuildStore();
  const hub = new FakeHub();
  const activity = new FakeActivity();
  const presence = new FakePresence();
  const handler = new CommandHandler(
    guilds as unknown as GuildStore,
    {
      verify: () => Effect.succeed({ valid: false, reason: "not supplied" }),
    } as unknown as MargonemProofVerifier,
    presence as unknown as PresenceStore,
    hub as unknown as RealtimeHub,
    activity as unknown as ActivityPublisher,
    {} as MapPingService,
    { clearSubscription: () => undefined } as unknown as AirTagService,
  );
  return { handler, guilds, hub, activity, presence };
};

describe("CommandHandler session lifecycle", () => {
  test("accepts readable JSON commands for local diagnostic sockets", async () => {
    const { handler, hub } = setup();
    const target = makeSocket();
    Object.assign(target.socket.data, { frameEncoding: "json" });

    await Effect.runPromise(
      handler.handle(
        target.socket,
        JSON.stringify({
          v: 1,
          type: "session.join",
          requestId: "request-json",
          data: {},
        }),
      ),
    );

    expect(target.closes).toEqual([]);
    expect(hub.responses).toContainEqual(
      expect.objectContaining({
        requestId: "request-json",
        status: "success",
      }),
    );
  });

  test("keeps game sessions available when Margonem proof is unavailable", async () => {
    const { handler, hub } = setup();
    const { socket } = makeSocket();
    socket.data = { ...socket.data, platform: "game" };
    const command = encode({
      v: 1,
      type: "session.join",
      requestId: "request-1",
      data: {
        world: "alpha",
        character: {
          world: "alpha",
          name: "Hero",
          lvl: 100,
          icon: "hero.gif",
          characterId: "10",
          accountId: "20",
          prof: "w",
          clan: { id: 30, name: "Clan", rank: 1 },
        },
      },
    });

    await Effect.runPromise(handler.handle(socket, Buffer.from(command)));

    expect(socket.data.joined).toBe(true);
    expect(socket.data.confidence).toBe("reported");
    expect(hub.responses).toContainEqual(
      expect.objectContaining({ requestId: "request-1", status: "success" }),
    );
  });

  test("supports deterministic rejoin and emits request/response plus joined events", async () => {
    const { handler, hub, activity } = setup();
    const { socket } = makeSocket();
    const command = encode({
      v: 1,
      type: "session.join",
      requestId: "request-1",
      data: {},
    });
    await Effect.runPromise(handler.handle(socket, Buffer.from(command)));
    await Effect.runPromise(handler.handle(socket, Buffer.from(command)));
    expect(socket.data.joined).toBe(true);
    expect(hub.responses).toHaveLength(2);
    expect(hub.events).toHaveLength(2);
    expect(hub.responses[0]).toMatchObject({
      data: { connectionId: "connection-1" },
    });
    expect(hub.events[0]).toMatchObject({
      data: { connectionId: "connection-1" },
    });
    expect(activity.calls.map(({ type }) => type)).toEqual(["CONNECT_EVENT"]);
  });

  test("repeated equivalent rebalances refresh server roles without emitting client invalidations", async () => {
    const { handler, guilds, hub, presence } = setup();
    const target = makeSocket();
    target.socket.data.joined = true;
    target.socket.data.guilds = [guild([Permission.LOOTLOG_TIMERS_READ])];
    target.socket.data.subscriptions.set("custom", {
      topic: "party.ready-room",
    });
    const subscriptions = target.socket.data.subscriptions;
    hub.sockets.push(target.socket);
    guilds.guilds = [
      {
        ...guild(),
        roles: [
          {
            id: "replacement-1",
            lvlRangeFrom: 0,
            lvlRangeTo: 300,
            permissions: [Permission.LOOTLOG_TIMERS_READ],
          },
          {
            id: "replacement-2",
            lvlRangeFrom: 200,
            lvlRangeTo: 500,
            permissions: [Permission.LOOTLOG_TIMERS_READ],
          },
        ],
      },
    ];
    for (let index = 0; index < 4; index++) {
      await Effect.runPromise(handler.rebalanceUser("discord-1", "user-1"));
    }
    expect(target.socket.data.guilds).toBe(guilds.guilds);
    expect(target.socket.data.subscriptions).toBe(subscriptions);
    expect(hub.events).toEqual([]);
    expect(presence.reconciled).toEqual([]);
  });

  test("revoking one air-tag scope preserves authorized scopes in other organizations", async () => {
    const { handler, guilds, hub } = setup();
    const target = makeSocket();
    target.socket.data.joined = true;
    const one = guild();
    const two = {
      ...guild(),
      guild: { id: "organization-2", ownerId: "owner" },
    };
    target.socket.data.guilds = [one, two];
    const scope = (guildId: string) => ({
      guildId,
      world: "fobos",
      mapId: 1,
      subscription: {
        topic: "map.air-tags" as const,
        organizationId: guildId,
        world: "fobos",
        mapId: 1,
      },
    });
    const retained = scope("organization-2");
    target.socket.data.airTagScopes = [scope("organization-1"), retained];
    target.socket.data.subscriptions = new Map(
      target.socket.data.airTagScopes.map((entry) => [
        entry.guildId,
        entry.subscription,
      ]),
    );
    hub.sockets.push(target.socket);
    guilds.guilds = [guild([Permission.LOOTLOG_CHAT_READ]), two];
    await Effect.runPromise(handler.rebalanceUser("discord-1", "user-1"));
    expect(target.socket.data.airTagScopes).toEqual([retained]);
    expect(
      [...target.socket.data.subscriptions.values()].filter(
        (entry) => entry.topic === "map.air-tags",
      ),
    ).toEqual([retained.subscription]);
  });

  test("reconnect snapshots retain a stable compact version until access changes", async () => {
    const { handler, guilds, hub } = setup();
    const target = makeSocket();
    const join = Buffer.from(encode({ v: 1, type: "session.join", data: {} }));
    await Effect.runPromise(handler.handle(target.socket, join));
    await Effect.runPromise(handler.handle(target.socket, join));
    const readPolicy = (index: number) => {
      const event = hub.events[index];
      const decoded = decodeServerEvent(event);
      if (decoded.type !== "session.joined" || !decoded.data.accessPolicy)
        throw new Error("Missing joined policy");
      return decoded.data.accessPolicy;
    };
    const previous = readPolicy(0);
    expect(previous.version).toMatch(/^[a-f0-9]{64}$/);
    expect(readPolicy(1)).toEqual(previous);
    guilds.guilds = [guild([Permission.LOOTLOG_CHAT_READ])];
    await Effect.runPromise(handler.handle(target.socket, join));
    expect(readPolicy(2).version).not.toBe(previous.version);
  });

  test.each([false, true])(
    "a denied join sends an empty policy before rejecting, previously joined: %s",
    async (previouslyJoined) => {
      const { handler, guilds, hub, activity, presence } = setup();
      const target = makeSocket();
      if (previouslyJoined) {
        target.socket.data.joined = true;
        target.socket.data.guilds = [guild()];
        target.socket.data.subscriptions.set("old-scope", {
          topic: "organization.presence",
          organizationId: "organization-1",
        });
        target.socket.data.airTagScopes = [
          {
            guildId: "organization-1",
            world: "fobos",
            mapId: 1,
            subscription: {
              topic: "map.air-tags",
              organizationId: "organization-1",
              world: "fobos",
              mapId: 1,
            },
          },
        ];
        target.socket.data.presence = {
          userId: "user-1",
          sessionId: "connection-1",
          organizationIds: ["organization-1"],
          platform: "web-app",
          status: "online",
          confidence: "reported",
          isAfk: false,
          lastSeen: 1,
        };
      }
      guilds.guilds = [];
      await Effect.runPromise(
        handler.handle(
          target.socket,
          Buffer.from(
            encode({
              v: 1,
              type: "session.join",
              requestId: "denied-join",
              data: {},
            }),
          ),
        ),
      );
      expect(hub.events).toHaveLength(1);
      expect(hub.deliveryOrder).toEqual(["event", "response"]);
      const event = decodeServerEvent(hub.events[0]);
      expect(event).toMatchObject({
        type: "permissions.updated",
        data: {
          organizationIds: [],
          subscriptionScopes: [],
          accessPolicy: { organizations: [] },
        },
      });
      if (event.type !== "permissions.updated")
        throw new Error("Missing policy event");
      expect(event.data.accessPolicy?.version).toMatch(/^[a-f0-9]{64}$/);
      expect(hub.responses).toEqual([
        {
          v: 1,
          requestId: "denied-join",
          status: "error",
          error: {
            code: "COMMAND_REJECTED",
            message: "no authorized organizations",
            retryable: false,
          },
        },
      ]);
      expect(target.socket.data.guilds).toEqual([]);
      expect(target.socket.data.joined).toBe(false);
      expect(target.socket.data.subscriptions.size).toBe(0);
      expect(target.socket.data.airTagScopes).toEqual([]);
      expect(target.socket.data.presence).toBeUndefined();
      expect(presence.reconciled).toEqual([target.socket]);
      expect(activity.calls).toEqual(
        previouslyJoined
          ? [{ type: "DISCONNECT_EVENT", ids: ["organization-1"] }]
          : [],
      );
    },
  );

  test("rebalances permissions and disconnects sessions with no organizations", async () => {
    const { handler, guilds, hub, activity, presence } = setup();
    const target = makeSocket();
    target.socket.data.joined = true;
    target.socket.data.guilds = [guild()];
    target.socket.data.presence = {
      userId: "user-1",
      sessionId: "connection-1",
      organizationIds: ["organization-1"],
      platform: "web-app",
      status: "online",
      confidence: "reported",
      isAfk: false,
      lastSeen: 1,
    };
    hub.sockets.push(target.socket);
    guilds.guilds = [];
    await Effect.runPromise(handler.rebalanceUser("discord-1", "user-1"));
    expect(activity.calls).toEqual([
      { type: "DISCONNECT_EVENT", ids: ["organization-1"] },
    ]);
    expect(target.closes).toEqual([1008]);
    expect(presence.reconciled).toEqual([target.socket]);
    expect(target.socket.data.presence).toBeUndefined();
    expect(hub.events).toHaveLength(1);
  });

  test("applies revoked tier grants and narrower level ranges to connected sessions", async () => {
    const { handler, guilds, hub } = setup();
    const target = makeSocket();
    target.socket.data.joined = true;
    target.socket.data.guilds = [
      guild([
        Permission.LOOTLOG_TIMERS_READ,
        Permission.LOOTLOG_TIMERS_HEROES_READ,
        Permission.LOOTLOG_TIMERS_TITANS_READ,
      ]),
    ];
    hub.sockets.push(target.socket);
    const timer = (
      type: "HERO" | "TITAN",
      lvl: number,
    ): typeof ServerEvent.Type => ({
      v: 1,
      type: "timer.created",
      data: {
        organizationId: "organization-1",
        payload: { guildId: "organization-1", npc: { type, lvl } },
      },
    });
    const titan = timer("TITAN", 250);
    const lowLevelHero = timer("HERO", 105);
    const allowedHero = timer("HERO", 250);
    for (const event of [titan, lowLevelHero, allowedHero]) {
      expect(canReadSourceEvent(target.socket.data, event)).toBe(true);
    }

    guilds.guilds = [
      {
        guild: { id: "organization-1", ownerId: "owner" },
        roles: [
          {
            id: "role",
            lvlRangeFrom: 200,
            lvlRangeTo: 500,
            permissions: [
              Permission.LOOTLOG_TIMERS_READ,
              Permission.LOOTLOG_TIMERS_HEROES_READ,
            ],
          },
        ],
      },
    ];
    await Effect.runPromise(handler.rebalanceUser("discord-1", "user-1"));

    expect(hub.events).toHaveLength(1);
    expect(hub.events[0]).toMatchObject({
      type: "permissions.updated",
      data: {
        changes: [
          {
            organizationId: "organization-1",
            areas: ["timers"],
            restricted: true,
            expanded: false,
          },
        ],
      },
    });
    await Effect.runPromise(handler.rebalanceUser("discord-1", "user-1"));
    expect(hub.events).toHaveLength(1);
    expect(canReadSourceEvent(target.socket.data, titan)).toBe(false);
    expect(canReadSourceEvent(target.socket.data, lowLevelHero)).toBe(false);
    expect(canReadSourceEvent(target.socket.data, allowedHero)).toBe(true);
    expect(target.socket.data.joined).toBe(true);
    expect(target.closes).toEqual([]);
  });

  test("closes unknown MessagePack commands as malformed protocol frames", async () => {
    const { handler } = setup();
    const target = makeSocket();
    await Effect.runPromise(
      handler.handle(
        target.socket,
        Buffer.from(encode({ v: 1, type: "rooms.join-raw", data: {} })),
      ),
    );
    expect(target.closes).toEqual([1007]);
  });

  test("preserves invalid-payload acknowledgements for legacy map commands", async () => {
    const { handler, hub } = setup();
    const target = makeSocket();
    await Effect.runPromise(
      handler.handle(
        target.socket,
        Buffer.from(
          encode({
            v: 1,
            type: "map-ping.send",
            requestId: "request-invalid",
            data: { expectedMapId: 7, type: "enemy", x: -1, y: 1 },
          }),
        ),
      ),
    );
    expect(target.closes).toEqual([]);
    expect(hub.responses).toContainEqual({
      v: 1,
      requestId: "request-invalid",
      status: "success",
      data: { status: "rejected", code: "invalid-payload" },
    });
  });

  test("maps typed command rejections without marking them retryable", async () => {
    const { handler, hub } = setup();
    const target = makeSocket();
    await Effect.runPromise(
      handler.handle(
        target.socket,
        Buffer.from(
          encode({
            v: 1,
            type: "subscription.unsubscribe",
            requestId: "request-not-joined",
            data: { topic: "organization.presence" },
          }),
        ),
      ),
    );
    expect(hub.responses).toContainEqual({
      v: 1,
      requestId: "request-not-joined",
      status: "error",
      error: {
        code: "COMMAND_REJECTED",
        message: "session.join is required",
        retryable: false,
      },
    });
  });

  test("does not expose dependency failures through command responses", async () => {
    const { handler, guilds, hub } = setup();
    guilds.getUserGuilds = () => Effect.fail(new Error("database secret"));
    const target = makeSocket();
    await Effect.runPromise(
      handler.handle(
        target.socket,
        Buffer.from(
          encode({
            v: 1,
            type: "session.join",
            requestId: "request-dependency",
            data: {},
          }),
        ),
      ),
    );
    expect(hub.responses).toContainEqual({
      v: 1,
      requestId: "request-dependency",
      status: "error",
      error: {
        code: "COMMAND_REJECTED",
        message: "command temporarily unavailable",
        retryable: true,
      },
    });
  });
});

test("client NPC policy decisions match gateway source filtering across roles and tiers", () => {
  for (const viewer of ["member", "owner"]) {
    for (const permissions of [
      [],
      [Permission.ADMIN],
      [
        Permission.LOOTLOG_TIMERS_READ,
        Permission.LOOTLOG_CHAT_READ,
        Permission.LOOTLOG_NOTIFICATIONS_READ,
      ],
      [
        Permission.LOOTLOG_TIMERS_READ,
        Permission.LOOTLOG_TIMERS_TITANS_READ,
        Permission.LOOTLOG_CHAT_READ,
        Permission.LOOTLOG_CHAT_HEROES_READ,
      ],
    ]) {
      const target = makeSocket();
      Object.assign(target.socket.data, { discordId: viewer });
      target.socket.data.guilds = [
        {
          ...guild(permissions),
          roles: [
            { id: "role", lvlRangeFrom: 200, lvlRangeTo: 500, permissions },
          ],
        },
      ];
      const policy = createAccessPolicySnapshot(
        target.socket.data.guilds,
        viewer,
      ).organizations[0];
      if (!policy) throw new Error("Missing fixture policy");
      for (const type of ["ELITE2", "HERO", "EVENT_HERO", "TITAN", "INVALID"]) {
        for (const lvl of [100, 250, 600]) {
          const npc = { type, lvl };
          for (const feature of ["timers", "chat", "notifications"] as const) {
            let event: typeof ServerEvent.Type;
            if (feature === "timers")
              event = {
                v: 1,
                type: "timer.created",
                data: { organizationId: "organization-1", payload: { npc } },
              };
            else if (feature === "chat")
              event = {
                v: 1,
                type: "chat.created",
                data: {
                  organizationId: "organization-1",
                  payload: { type: "NPC", npc },
                },
              };
            else
              event = {
                v: 1,
                type: "notification.sent",
                data: { organizationId: "organization-1", payload: { npc } },
              };
            expect(canReadPolicyNpc(policy, feature, npc)).toBe(
              canReadSourceEvent(target.socket.data, event),
            );
          }
        }
      }
    }
  }
});
