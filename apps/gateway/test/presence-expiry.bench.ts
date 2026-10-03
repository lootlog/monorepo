import { BunRedis } from "@effect/platform-bun";
import { Effect, ManagedRuntime } from "effect";
import { Redis } from "effect/persistence";
import { GenericContainer, Wait } from "testcontainers";
import {
  RedisGatewayStore,
  type RedisGatewayCommands,
} from "#src/platform/redis-store";
import { PresenceStore } from "#src/realtime/presence-store";
import type { GatewaySocket, SessionData } from "#src/realtime/session";

// Requires Docker. Reply sizes use JSON encoding, not Redis wire bytes.
const workloads = [
  { organizations: 1, sessionsPerOrganization: 100, replicas: 1 },
  { organizations: 10, sessionsPerOrganization: 100, replicas: 1 },
  { organizations: 100, sessionsPerOrganization: 10, replicas: 2 },
  { organizations: 100, sessionsPerOrganization: 50, replicas: 4 },
];

const container = await new GenericContainer(
  "docker.dragonflydb.io/dragonflydb/dragonfly:v1.34.1",
)
  .withCommand(["--logtostderr", "--proactor_threads=2"])
  .withExposedPorts(6379)
  .withWaitStrategy(Wait.forListeningPorts())
  .start();

const runtime = ManagedRuntime.make(
  BunRedis.layer({
    url: `redis://${container.getHost()}:${container.getMappedPort(6379)}`,
  }),
);

try {
  const redis = await runtime.runPromise(Redis.Redis);
  const encoder = new TextEncoder();

  const readServerCommands = async () => {
    const stats = await runtime.runPromise(redis.send<string>("INFO", "stats"));
    const value = /^total_commands_processed:(\d+)\r?$/m.exec(stats)?.[1];
    const count = Number(value);

    if (!Number.isSafeInteger(count) || count < 0)
      throw new Error("Dragonfly did not report a valid command counter");

    return count;
  };

  for (const {
    organizations,
    sessionsPerOrganization,
    replicas,
  } of workloads) {
    const store = new RedisGatewayStore(
      redis,
      {
        host: container.getHost(),
        port: container.getMappedPort(6379),
        username: "",
        password: "",
        keyPrefix: crypto.randomUUID(),
      },
      (effect) => runtime.runPromise(effect),
      () => {},
    );

    const now = Date.now();
    let measured = false;
    let storeCommands = 0;
    let replyJsonBytes = 0;
    let payloadReads = 0;

    const measure = async <A>(
      reply: Promise<A>,
      payloadEntries = 0,
    ): Promise<A> => {
      const value = await reply;

      if (measured) {
        storeCommands++;
        replyJsonBytes += encoder.encode(
          JSON.stringify(value) ?? "",
        ).byteLength;
        payloadReads += payloadEntries;
      }

      return value;
    };

    const command: RedisGatewayCommands = {
      get: (...args) => measure(store.command.get(...args)),
      set: (...args) => measure(store.command.set(...args)),
      del: (...args) => measure(store.command.del(...args)),
      expire: (...args) => measure(store.command.expire(...args)),
      incr: (...args) => measure(store.command.incr(...args)),
      sadd: (...args) => measure(store.command.sadd(...args)),
      srem: (...args) => measure(store.command.srem(...args)),
      smembers: (...args) => measure(store.command.smembers(...args)),
      mget: (keys) => measure(store.command.mget(keys), keys.length),
      eval: <A = unknown>(...args: Parameters<RedisGatewayCommands["eval"]>) =>
        measure(store.command.eval<A>(...args)),
      flushdb: () => measure(store.command.flushdb()),
    };

    const makePresenceStore = () =>
      new PresenceStore(
        { command },
        {
          instanceId: crypto.randomUUID(),
          publishPresence: () => Promise.resolve(),
          setPresence: (socket, presence) => {
            socket.data.presence = presence;
          },
        },
        () => now,
      );

    const publisher = makePresenceStore();

    for (let organization = 0; organization < organizations; organization++) {
      for (let session = 0; session < sessionsPerOrganization; session++) {
        const data: SessionData = {
          discordId: `d-${organization}-${session}`,
          userId: `u-${organization}-${session}`,
          connectionId: `s-${organization}-${session}`,
          platform: "game",
          joined: true,
          confidence: "verified",
          guilds: [
            { guild: { id: `o-${organization}`, ownerId: "owner" }, roles: [] },
          ],
          subscriptions: new Map(),
          airTagScopes: [],
        };

        const socket: GatewaySocket = {
          data,
          close: () => {},
          getBufferedAmount: () => 0,
          send: () => 1,
        };

        await Effect.runPromise(
          publisher.publish(socket, { organizationIds: [] }),
        );
      }
    }

    const sweepers = Array.from({ length: replicas }, makePresenceStore);
    const serverCommandsBefore = await readServerCommands();
    measured = true;
    const started = performance.now();
    await Promise.all(
      sweepers.map((presence) => Effect.runPromise(presence.sweepExpired())),
    );
    const sweepMs = performance.now() - started;
    measured = false;

    // Consecutive INFO snapshots include one measurement command in their delta.
    const serverCommands =
      (await readServerCommands()) - serverCommandsBefore - 1;

    console.log(
      JSON.stringify({
        organizations,
        sessionsPerOrganization,
        replicas,
        storeCommands,
        serverCommands,
        replyJsonBytes,
        payloadReads,
        sweepMs: Math.round(sweepMs * 100) / 100,
      }),
    );
  }
} finally {
  try {
    await runtime.dispose();
  } finally {
    await container.stop();
  }
}
