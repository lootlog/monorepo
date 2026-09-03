import { SubscriptionScope } from "@lootlog/protocol/realtime";
import { Effect, Queue, Schedule, Schema } from "effect";
import * as Redis from "effect/unstable/persistence/Redis";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import type { BackgroundTaskRunner } from "./background-tasks.js";

type RedisGatewayConfig = Omit<GatewayConfiguration["redis"], "password"> & {
  readonly password: string;
};

export interface FederatedRealtimeMessage {
  readonly id: string;
  readonly sourceInstanceId: string;
  readonly scopeKey?: string;
  readonly scope?: typeof SubscriptionScope.Type;
  readonly scopes?: ReadonlyArray<typeof SubscriptionScope.Type>;
  readonly userId?: string;
  readonly discordId?: string;
  readonly excludeConnectionId?: string;
  readonly recipientPlatform?: "game" | "web-app";
  readonly recipientWorld?: string;
  readonly recipientMapId?: number;
  readonly presenceAudience?: "basic" | "precise";
  readonly organizationId?: string;
  readonly frame?: string;
  readonly control?: {
    readonly type: "permissions.rebalance";
    readonly discordId: string;
    readonly userId: string;
  };
}

const FederatedRealtimeMessageJson = Schema.fromJsonString(
  Schema.Struct({
    id: Schema.String,
    sourceInstanceId: Schema.String,
    scopeKey: Schema.optional(Schema.String),
    scope: Schema.optional(SubscriptionScope),
    scopes: Schema.optional(Schema.Array(SubscriptionScope)),
    userId: Schema.optional(Schema.String),
    discordId: Schema.optional(Schema.String),
    excludeConnectionId: Schema.optional(Schema.String),
    recipientPlatform: Schema.optional(Schema.Literals(["game", "web-app"])),
    recipientWorld: Schema.optional(Schema.String),
    recipientMapId: Schema.optional(Schema.Number),
    presenceAudience: Schema.optional(Schema.Literals(["basic", "precise"])),
    organizationId: Schema.optional(Schema.String),
    frame: Schema.optional(Schema.String),
    control: Schema.optional(
      Schema.Struct({
        type: Schema.Literal("permissions.rebalance"),
        discordId: Schema.String,
        userId: Schema.String,
      }),
    ),
  }),
);
const decodeFederatedRealtimeMessage = Schema.decodeUnknownSync(
  FederatedRealtimeMessageJson,
);

export class RedisGatewayStore {
  readonly command: RedisGatewayCommands;
  readonly channel: string;

  constructor(
    private readonly redis: Redis.Redis["Service"],
    config: RedisGatewayConfig,
    private readonly runEffect: <A>(
      effect: Effect.Effect<A, Redis.RedisError>,
    ) => Promise<A>,
    private readonly runBackground: BackgroundTaskRunner,
  ) {
    const prefix = (key: string) => `${config.keyPrefix}:${key}`;
    const run = this.runEffect;
    const scripts = new Map<string, Redis.Script<any>>();
    this.command = {
      get: (key) => run(redis.send("GET", prefix(key))),
      set: (key, value, ...options) =>
        run(redis.send("SET", prefix(key), value, ...options.map(String))),
      del: (...keys) => run(redis.send("DEL", ...keys.map(prefix))),
      expire: (key, seconds) =>
        run(redis.send("EXPIRE", prefix(key), String(seconds))),
      incr: (key) => run(redis.send("INCR", prefix(key))),
      sadd: (key, ...members) =>
        run(redis.send("SADD", prefix(key), ...members)),
      srem: (key, ...members) =>
        run(redis.send("SREM", prefix(key), ...members)),
      smembers: (key) => run(redis.send("SMEMBERS", prefix(key))),
      mget: (keys) => run(redis.send("MGET", ...keys.map(prefix))),
      eval: (script, numberOfKeys, ...keysAndArgs) =>
        (() => {
          const cacheKey = `${numberOfKeys}:${script}`;
          let descriptor = scripts.get(cacheKey);
          if (descriptor === undefined) {
            descriptor = Redis.script(
              (...parameters: ReadonlyArray<unknown>) => parameters,
              { lua: script, numberOfKeys },
            );
            scripts.set(cacheKey, descriptor);
          }
          const parameters = keysAndArgs.map((value, index) =>
            index < numberOfKeys ? prefix(String(value)) : String(value),
          );
          return run(redis.eval(descriptor)(...parameters));
        })(),
      flushdb: () => run(redis.send("FLUSHDB")),
    };
    this.channel = `${config.keyPrefix}:realtime:federation:v1`;
  }

  async connect(): Promise<void> {
    await this.runEffect(this.redis.send("PING"));
  }

  close(): Promise<void> {
    return Promise.resolve();
  }

  async publish(message: FederatedRealtimeMessage): Promise<void> {
    await this.runEffect(
      this.redis.send("PUBLISH", this.channel, JSON.stringify(message)),
    );
  }

  async subscribe(
    listener: (message: FederatedRealtimeMessage) => void,
  ): Promise<void> {
    let markReady: () => void = () => undefined;
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });
    const redis = this.redis;
    const channel = this.channel;
    const consume = Effect.scoped(
      Effect.gen(function* () {
        const messages = yield* redis.subscribe(channel);
        yield* Effect.sync(markReady);
        while (true) {
          const { message: raw } = yield* Queue.take(messages);
          try {
            const message = decodeFederatedRealtimeMessage(raw);
            if (
              typeof message.id === "string" &&
              typeof message.sourceInstanceId === "string" &&
              (typeof message.frame === "string" ||
                message.control?.type === "permissions.rebalance")
            ) {
              listener(message);
            }
          } catch {
            // Malformed federation frames are isolated to Redis and never reach clients.
          }
        }
      }),
    ).pipe(
      Effect.retry(
        Schedule.min([
          Schedule.exponential("100 millis").pipe(Schedule.jittered),
          Schedule.spaced("5 seconds"),
        ]),
      ),
    );
    this.runBackground("redis.subscription", consume);
    await ready;
  }
}

export interface RedisGatewayCommands {
  readonly get: (key: string) => Promise<string | null>;
  readonly set: (
    key: string,
    value: string,
    ...options: ReadonlyArray<string | number>
  ) => Promise<unknown>;
  readonly del: (...keys: string[]) => Promise<number>;
  readonly expire: (key: string, seconds: number) => Promise<number>;
  readonly incr: (key: string) => Promise<number>;
  readonly sadd: (key: string, ...members: string[]) => Promise<number>;
  readonly srem: (key: string, ...members: string[]) => Promise<number>;
  readonly smembers: (key: string) => Promise<string[]>;
  readonly mget: (keys: string[]) => Promise<Array<string | null>>;
  readonly eval: <A = unknown>(
    script: string,
    numberOfKeys: number,
    ...keysAndArgs: ReadonlyArray<string | number>
  ) => Promise<A>;
  readonly flushdb: () => Promise<unknown>;
}
