import { describe, expect, test } from "bun:test";
import { encode } from "@msgpack/msgpack";
import { Permission } from "@lootlog/schema/permissions";
import { Effect } from "effect";
import { CommandHandler } from "./command-handler.js";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import type { GuildStore } from "#src/guilds/guild-store";
import type { MargonemProofVerifier } from "#src/auth/margonem-proof";
import type { ActivityPublisher } from "#src/rabbit/activity-publisher";
import type { AirTagService } from "#src/realtime/air-tag-service";
import type { MapPingService } from "#src/realtime/map-ping-service";
import type { PresenceStore } from "#src/realtime/presence-store";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket, SessionData } from "#src/realtime/session";
import type { UserGuildData } from "#src/guilds/types/guild.types";

const guild = (
  permissions: Permission[] = [Permission.LOOTLOG_ONLINE_PLAYERS_READ],
): UserGuildData => ({
  guild: { id: "organization-1", ownerId: "owner" },
  roles: [{ id: "role", lvlRangeFrom: 0, lvlRangeTo: 500, permissions }],
});

class FakeGuildStore {
  guilds: UserGuildData[] = [guild()];
  getUserGuilds(): Effect.Effect<UserGuildData[]> {
    return Effect.succeed(this.guilds);
  }
  invalidate(): Effect.Effect<void> {
    return Effect.void;
  }
}

class FakeHub {
  readonly responses: unknown[] = [];
  readonly events: unknown[] = [];
  readonly sockets: GatewaySocket[] = [];
  onPermissionRebalance(): void {}
  publishPermissionRebalance(): Effect.Effect<void> {
    return Effect.void;
  }
  sendResponse(_socket: GatewaySocket, response: unknown): boolean {
    this.responses.push(response);
    return true;
  }
  sendEvent(_socket: GatewaySocket, event: unknown): boolean {
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
  const handler = new CommandHandler(
    { margonemAccountProofRequired: false } as GatewayConfiguration,
    guilds as unknown as GuildStore,
    {
      verify: () => Effect.succeed({ valid: false, reason: "not supplied" }),
    } as unknown as MargonemProofVerifier,
    {} as PresenceStore,
    hub as unknown as RealtimeHub,
    activity as unknown as ActivityPublisher,
    {} as MapPingService,
    { clearSubscription: () => undefined } as unknown as AirTagService,
  );
  return { handler, guilds, hub, activity };
};

describe("CommandHandler session lifecycle", () => {
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

  test("rebalances permissions and disconnects sessions with no organizations", async () => {
    const { handler, guilds, hub, activity } = setup();
    const target = makeSocket();
    target.socket.data.joined = true;
    target.socket.data.guilds = [guild()];
    hub.sockets.push(target.socket);
    guilds.guilds = [];
    await Effect.runPromise(handler.rebalanceUser("discord-1", "user-1"));
    expect(activity.calls).toEqual([
      { type: "DISCONNECT_EVENT", ids: ["organization-1"] },
    ]);
    expect(target.closes).toEqual([1008]);
    expect(hub.events).toHaveLength(1);
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
});
