import { describe, expect, test } from "bun:test";
import { decodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import { Effect } from "effect";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import type {
  FederatedRealtimeMessage,
  RedisGatewayStore,
} from "#src/platform/redis-store";
import { getScopeKey, RealtimeHub } from "./realtime-hub.js";
import type { GatewaySocket, SessionData } from "./session.js";

class FederationBus {
  readonly listeners: Array<(message: FederatedRealtimeMessage) => void> = [];
}

class FakeRedisStore {
  readonly command = {
    set: async () => "OK",
    del: async () => 1,
    sadd: async () => 1,
    srem: async () => 1,
    expire: async () => 1,
    smembers: async () => [],
    mget: async () => [],
  };

  constructor(private readonly bus: FederationBus) {}

  async subscribe(
    listener: (message: FederatedRealtimeMessage) => void,
  ): Promise<void> {
    this.bus.listeners.push(listener);
  }

  async publish(message: FederatedRealtimeMessage): Promise<void> {
    for (const listener of this.bus.listeners) {
      listener(message);
      listener(message);
    }
  }
}

const config = {
  maxBackpressureBytes: 1_024,
  maxBackpressureStrikes: 3,
} as GatewayConfiguration;

const makeSession = (connectionId: string): SessionData => ({
  discordId: `discord-${connectionId}`,
  userId: `user-${connectionId}`,
  connectionId,
  platform: "web-app",
  joined: true,
  guilds: [],
  subscriptions: new Map(),
  confidence: "reported",
  backpressureStrikes: 0,
});

const makeSocket = (
  data: SessionData,
  bufferedAmount = 0,
): {
  readonly socket: GatewaySocket;
  readonly sent: Uint8Array[];
  readonly closes: number[];
} => {
  const sent: Uint8Array[] = [];
  const closes: number[] = [];
  const socket = {
    data,
    getBufferedAmount: () => bufferedAmount,
    send: (bytes: Uint8Array) => {
      sent.push(bytes);
      return bytes.byteLength;
    },
    close: (code: number) => {
      closes.push(code);
    },
  } as unknown as GatewaySocket;
  return { socket, sent, closes };
};

describe("RealtimeHub federation", () => {
  test("fans permission rebalance out to every instance once", async () => {
    const bus = new FederationBus();
    const first = new RealtimeHub(
      config,
      new FakeRedisStore(bus) as unknown as RedisGatewayStore,
    );
    const second = new RealtimeHub(
      config,
      new FakeRedisStore(bus) as unknown as RedisGatewayStore,
    );
    await Effect.runPromise(first.start());
    await Effect.runPromise(second.start());
    const received: string[] = [];
    second.onPermissionRebalance((discordId, userId) =>
      Effect.sync(() => received.push(`${discordId}:${userId}`)).pipe(
        Effect.asVoid,
      ),
    );
    await Effect.runPromise(
      first.publishPermissionRebalance("discord-1", "user-1"),
    );
    await Bun.sleep(0);
    expect(received).toEqual(["discord-1:user-1"]);
  });

  test("delivers a federated event once to an exact logical subscription", async () => {
    const bus = new FederationBus();
    const first = new RealtimeHub(
      config,
      new FakeRedisStore(bus) as unknown as RedisGatewayStore,
    );
    const second = new RealtimeHub(
      config,
      new FakeRedisStore(bus) as unknown as RedisGatewayStore,
    );
    await Effect.runPromise(first.start());
    await Effect.runPromise(second.start());
    const scope = {
      topic: "organization.chat",
      organizationId: "organization-1",
    } as const;
    const target = makeSocket(makeSession("target"));
    target.socket.data.subscriptions.set(getScopeKey(scope), scope);
    second.register(target.socket);

    await first.publishToScope(scope, {
      v: 1,
      type: "chat.created",
      data: { organizationId: "organization-1", payload: { id: "message-1" } },
    });

    expect(target.sent).toHaveLength(1);
    expect(
      decodeRealtimeFrame(target.sent[0] ?? new Uint8Array()),
    ).toHaveProperty("type", "chat.created");
  });

  test("closes a persistently slow consumer with bounded backpressure", async () => {
    const bus = new FederationBus();
    const hub = new RealtimeHub(
      { ...config, maxBackpressureBytes: 1 } as GatewayConfiguration,
      new FakeRedisStore(bus) as unknown as RedisGatewayStore,
    );
    await Effect.runPromise(hub.start());
    const scope = {
      topic: "organization.chat",
      organizationId: "organization-1",
    } as const;
    const target = makeSocket(makeSession("slow"), 10);
    target.socket.data.subscriptions.set(getScopeKey(scope), scope);
    hub.register(target.socket);
    const event = {
      v: 1,
      type: "chat.created",
      data: { organizationId: "organization-1", payload: {} },
    } as const;
    await hub.publishToScope(scope, event);
    await hub.publishToScope(scope, event);
    await hub.publishToScope(scope, event);
    expect(target.sent).toHaveLength(0);
    expect(target.closes).toEqual([1013]);
  });
});
