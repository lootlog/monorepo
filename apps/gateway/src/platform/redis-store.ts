import { RedisScriptCache } from "@lootlog/database/redis-script";
import type { LootVisibilityNpc } from "@lootlog/domain/loot-visibility";
import {
  PartyGatheringEventSourceSchema,
  type PartyGatheringEventSource,
} from "#src/realtime/npc-event-visibility";
import { SubscriptionScope } from "@lootlog/protocol/realtime";
import { Cause, Effect, Predicate, Queue, Schedule, Schema } from "effect";
import * as Redis from "effect/unstable/persistence/Redis";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import {
  type BackgroundTaskRunner,
  yieldToEventLoop,
} from "./background-tasks.js";
import { FederationSequence } from "./federation-sequence.js";

type RedisGatewayConfig = Omit<GatewayConfiguration["redis"], "password"> & {
  readonly password: string;
};

export interface FederatedRealtimeMessage {
  readonly id: string;
  /** Position in the federation stream; replicas before version 4 omit it. */
  readonly sequence?: number;
  readonly sourceInstanceId: string;
  readonly sourceNpcs?: ReadonlyArray<LootVisibilityNpc>;
  readonly partyGatheringSource?: PartyGatheringEventSource;
  readonly scopeKey?: string;
  readonly scope?: typeof SubscriptionScope.Type;
  readonly scopes?: ReadonlyArray<typeof SubscriptionScope.Type>;
  readonly userId?: string;
  readonly discordId?: string;
  readonly excludeConnectionId?: string;
  readonly recipientPlatform?: "game" | "web-app";
  readonly recipientWorld?: string;
  readonly recipientMapId?: number;
  readonly recipientCharacterIds?: ReadonlyArray<string>;
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
    sequence: Schema.optional(Schema.Number),
    sourceInstanceId: Schema.String,
    partyGatheringSource: Schema.optional(PartyGatheringEventSourceSchema),
    sourceNpcs: Schema.optional(
      Schema.Array(
        Schema.Struct({
          level: Schema.NullOr(Schema.Number),
          type: Schema.NullOr(Schema.String),
        }),
      ),
    ),
    scopeKey: Schema.optional(Schema.String),
    scope: Schema.optional(SubscriptionScope),
    scopes: Schema.optional(Schema.Array(SubscriptionScope)),
    userId: Schema.optional(Schema.String),
    discordId: Schema.optional(Schema.String),
    excludeConnectionId: Schema.optional(Schema.String),
    recipientPlatform: Schema.optional(Schema.Literals(["game", "web-app"])),
    recipientWorld: Schema.optional(Schema.String),
    recipientMapId: Schema.optional(Schema.Number),
    recipientCharacterIds: Schema.optional(Schema.Array(Schema.String)),
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

const FEDERATION_SEQUENCE_KEY = "realtime:federation:v1:sequence";

// Numbering and publication are one step, so a number exists only for a frame
// Redis published. Older replicas ignore the added field.
const publishSequencedScript = `
local sequence = redis.call("INCR", KEYS[1])
redis.call("PUBLISH", ARGV[1], '{"sequence":' .. sequence .. ',' .. string.sub(ARGV[2], 2))
return sequence
`;

/** How long a hole in the federation sequence may wait for a reordered frame. */
const FEDERATION_REORDER_WINDOW_MS = 1_000;

/**
 * `interrupted`: the subscription dropped and frames may be missing.
 * `subscribed`: every sequenced frame since the last report arrived.
 * `gap`: sequenced frames were lost; sessions that expected them are stale.
 */
export type FederationState = "subscribed" | "interrupted" | "gap";

export class RedisGatewayStore {
  readonly command: RedisGatewayCommands;
  readonly channel: string;
  private readonly sequenceKey: string;
  private readonly subscriptionQueues = new Set<
    Queue.Dequeue<Redis.RedisMessage, Redis.RedisError>
  >();
  private pendingCommands = 0;
  private pendingPublications = 0;

  getDiagnostics() {
    let federationQueued = 0;

    for (const queue of this.subscriptionQueues)
      federationQueued += Queue.sizeUnsafe(queue);

    return {
      pendingCommands: this.pendingCommands,
      pendingPublications: this.pendingPublications,
      federationQueued,
    };
  }

  private async runCommand<A>(
    effect: Effect.Effect<A, Redis.RedisError>,
  ): Promise<A> {
    this.pendingCommands++;

    try {
      return await this.runEffect(effect);
    } finally {
      this.pendingCommands--;
    }
  }

  constructor(
    private readonly redis: Redis.Redis["Service"],
    config: RedisGatewayConfig,
    private readonly runEffect: <A>(
      effect: Effect.Effect<A, Redis.RedisError>,
    ) => Promise<A>,
    private readonly runBackground: BackgroundTaskRunner,
  ) {
    const prefix = (key: string) => `${config.keyPrefix}:${key}`;

    const run = <A>(effect: Effect.Effect<A, Redis.RedisError>) =>
      this.runCommand(effect);

    const scripts = new RedisScriptCache();
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
      zadd: (key, score, member) =>
        run(redis.send("ZADD", prefix(key), String(score), member)),
      mget: (keys) => run(redis.send("MGET", ...keys.map(prefix))),
      eval: <A>(
        script: string,
        numberOfKeys: number,
        ...keysAndArgs: ReadonlyArray<string | number>
      ) => {
        const descriptor = scripts.get<A>(script, numberOfKeys);

        const parameters = keysAndArgs.map((value, index) =>
          index < numberOfKeys ? prefix(String(value)) : String(value),
        );

        return run(redis.eval(descriptor)(...parameters));
      },
      flushdb: () => run(redis.send("FLUSHDB")),
    };
    this.channel = `${config.keyPrefix}:realtime:federation:v1`;
    this.sequenceKey = prefix(FEDERATION_SEQUENCE_KEY);
  }

  async connect(): Promise<void> {
    await this.runEffect(this.redis.send("PING"));
  }

  close(): Promise<void> {
    return Promise.resolve();
  }

  async publish(message: FederatedRealtimeMessage): Promise<void> {
    this.pendingPublications++;

    try {
      await this.command.eval(
        publishSequencedScript,
        1,
        FEDERATION_SEQUENCE_KEY,
        this.channel,
        JSON.stringify(message),
      );
    } finally {
      this.pendingPublications--;
    }
  }

  /**
   * Pub/Sub has no replay. Sequence numbers show whether a dropped
   * subscription lost frames, so `onStateChange` reports the gap only when it
   * lost some. See {@link FederationState}.
   */
  async subscribe(
    listener: (message: FederatedRealtimeMessage) => void,
    onStateChange: (state: FederationState) => void = () => undefined,
  ): Promise<void> {
    let markReady: () => void = () => undefined;

    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });

    const redis = this.redis;
    const channel = this.channel;
    const sequenceKey = this.sequenceKey;
    const subscriptionQueues = this.subscriptionQueues;
    const sequence = new FederationSequence(FEDERATION_REORDER_WINDOW_MS);
    let resuming = false;

    const resumed = () => {
      resuming = false;
      onStateChange("subscribed");
      markReady();
    };

    const consume = Effect.scoped(
      Effect.gen(function* () {
        const messages = yield* redis.subscribe(channel);
        subscriptionQueues.add(messages);
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            subscriptionQueues.delete(messages);
          }),
        );

        // Frames numbered up to the counter were published before this
        // subscription existed or are already queued for it.
        const published = yield* redis.send<string | null>("GET", sequenceKey);

        const continuity = sequence.resume(
          Number(published ?? 0),
          performance.now(),
        );

        if (continuity === "lost") onStateChange("gap");
        resuming = continuity === "pending";

        if (!resuming) resumed();

        yield* Effect.sleep("250 millis").pipe(
          Effect.andThen(
            Effect.sync(() => {
              if (!sequence.expired(performance.now())) return;
              onStateChange("gap");

              if (resuming) resumed();
            }),
          ),
          Effect.forever,
          Effect.forkScoped,
        );

        let reportedLoss = false;
        let batchStarted = performance.now();
        let batchSize = 0;

        while (true) {
          const { message: raw } = yield* Queue.take(messages);

          // A dropped subscriber leaves its backlog readable until it drains.
          // Report the interruption now so resubscription starts, but keep
          // delivering the backlog: sessions may survive the interruption.
          if (!reportedLoss && !Predicate.isTagged(messages.state, "Open")) {
            reportedLoss = true;
            onStateChange("interrupted");
          }

          try {
            const message = decodeFederatedRealtimeMessage(raw);

            if (
              message.sequence !== undefined &&
              sequence.observe(message.sequence, performance.now()) &&
              resuming
            )
              resumed();

            if (
              message.frame !== undefined ||
              message.control?.type === "permissions.rebalance"
            ) {
              listener(message);
            }
          } catch {
            // Malformed federation frames are isolated to Redis and never reach clients.
          }

          // Effect's automatic yield can retain this fiber for hundreds of ms.
          // Release the event loop without dropping/reordering federation frames.
          batchSize++;

          if (batchSize >= 64 || performance.now() - batchStarted >= 4) {
            yield* yieldToEventLoop;
            batchSize = 0;
            batchStarted = performance.now();
          }
        }
      }),
    ).pipe(
      Effect.catchDefect((defect) => Effect.fail(defect)),
      Effect.tapCause((cause) =>
        Cause.hasInterruptsOnly(cause)
          ? Effect.void
          : Effect.sync(() => onStateChange("interrupted")),
      ),
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

export type RedisScriptReply =
  | string
  | number
  | null
  | ReadonlyArray<RedisScriptReply>;

export interface RedisGatewayCommands {
  readonly get: (key: string) => Promise<string | null>;
  readonly set: (
    key: string,
    value: string,
    ...options: ReadonlyArray<string | number>
  ) => Promise<string | null>;
  readonly del: (...keys: string[]) => Promise<number>;
  readonly expire: (key: string, seconds: number) => Promise<number>;
  readonly incr: (key: string) => Promise<number>;
  readonly sadd: (key: string, ...members: string[]) => Promise<number>;
  readonly srem: (key: string, ...members: string[]) => Promise<number>;
  readonly smembers: (key: string) => Promise<string[]>;
  readonly zadd: (
    key: string,
    score: number,
    member: string,
  ) => Promise<number>;
  readonly mget: (keys: string[]) => Promise<Array<string | null>>;
  readonly eval: <A = unknown>(
    script: string,
    numberOfKeys: number,
    ...keysAndArgs: ReadonlyArray<string | number>
  ) => Promise<A>;
  readonly flushdb: () => Promise<"OK">;
}
