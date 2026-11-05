import { lootEventVisibilityNpcs } from "#src/realtime/source-event-visibility";
import {
  RabbitMessaging,
  type MessagingError,
  type RabbitMessagingService,
  type RabbitConsumer,
  type RabbitDelivery,
} from "@lootlog/messaging";
import {
  decodeRabbitEventJson,
  type CanonicalRabbitEventRoutingKey,
  type CanonicalRabbitEvent,
} from "@lootlog/protocol/rabbit/events";
import {
  RabbitExchange,
  RabbitRoutingKey,
  type RabbitQueueDefinition,
  type RabbitRoutingKeyName,
} from "@lootlog/protocol/rabbit/topology";
import type {
  ServerEvent,
  SubscriptionScope,
} from "@lootlog/protocol/realtime";
import type { GlobalChatChannelUpdate } from "@lootlog/schema/chat";
import { Effect, Layer, Option, Schema, type Types, type Scope } from "effect";
import { Commands, type CommandHandler } from "#src/realtime/command-handler";
import {
  globalChatScope,
  Hub,
  type RealtimeHub,
} from "#src/realtime/realtime-hub";
import { Presence, type PresenceStore } from "#src/realtime/presence-store";
import {
  Coverage,
  type CoveragePublisher,
} from "#src/rabbit/coverage-publisher";

type Event = typeof ServerEvent.Type;

type Scope = typeof SubscriptionScope.Type;

const globalChatChannelEvent = (update: GlobalChatChannelUpdate): Event => {
  if (update.type === "deleted") {
    const { type: _type, ...data } = update;

    return { v: 1, type: "global-chat.deleted", data };
  }

  const { type: _type, ...data } = update;

  return { v: 1, type: "global-chat.pinned", data };
};

interface ConsumerSpec {
  readonly queue: string;
  readonly routingKey: CanonicalRabbitEventRoutingKey;
  readonly retryRoutingKey?: RabbitRoutingKeyName;
  readonly deadLetterRoutingKey?: RabbitRoutingKeyName;
  readonly installRetryQueue?: boolean;
  /** Deliveries handled at once; 1 keeps the queue's order. */
  readonly prefetch?: number;
}

// A role edit queues one event per role holder, and each rebalance can wait
// on the API. Rebalances read current permissions and are idempotent, so they
// need no order and run side by side.
const MEMBER_ACCESS_PREFETCH = 8;

const retryable = <Key extends CanonicalRabbitEventRoutingKey>(
  queue: string,
  routingKey: Key,
  retryRoutingKey: RabbitRoutingKeyName,
  deadLetterRoutingKey: RabbitRoutingKeyName,
  installRetryQueue = true,
): ConsumerSpec & { readonly routingKey: Key } => ({
  queue,
  routingKey,
  retryRoutingKey,
  deadLetterRoutingKey,
  installRetryQueue,
});

const consumerSpecs = [
  retryable(
    "gateway-guilds-kills-accepted-v1",
    RabbitRoutingKey.GUILDS_KILLS_ACCEPTED_V1,
    RabbitRoutingKey.GUILDS_KILLS_ACCEPTED_V1_RETRY,
    RabbitRoutingKey.GUILDS_KILLS_ACCEPTED_V1_DLQ,
  ),
  retryable(
    "gateway-guilds-timers-update",
    RabbitRoutingKey.GUILDS_TIMERS_UPDATE,
    RabbitRoutingKey.GUILDS_TIMERS_UPDATE_RETRY,
    RabbitRoutingKey.GUILDS_TIMERS_UPDATE_DLQ,
  ),
  retryable(
    "gateway-guilds-timers-delete",
    RabbitRoutingKey.GUILDS_TIMERS_DELETE,
    RabbitRoutingKey.GUILDS_TIMERS_DELETE_RETRY,
    RabbitRoutingKey.GUILDS_TIMERS_DELETE_DLQ,
  ),
  retryable(
    "gateway-guilds-hero-sightings-update",
    RabbitRoutingKey.GUILDS_HERO_SIGHTINGS_UPDATE,
    RabbitRoutingKey.GUILDS_HERO_SIGHTINGS_UPDATE_RETRY,
    RabbitRoutingKey.GUILDS_HERO_SIGHTINGS_UPDATE_DLQ,
  ),
  retryable(
    "gateway-guilds-loots-create",
    RabbitRoutingKey.GUILDS_LOOTS_CREATE,
    RabbitRoutingKey.GUILDS_LOOTS_CREATE_RETRY,
    RabbitRoutingKey.GUILDS_LOOTS_CREATE_DLQ,
  ),
  retryable(
    "gateway-guilds-loots-share-update",
    RabbitRoutingKey.GUILDS_LOOTS_SHARE_UPDATE,
    RabbitRoutingKey.GUILDS_LOOTS_SHARE_UPDATE_RETRY,
    RabbitRoutingKey.GUILDS_LOOTS_SHARE_UPDATE_DLQ,
  ),
  retryable(
    "gateway-guilds-reservations-create",
    RabbitRoutingKey.GUILDS_RESERVATIONS_CREATE,
    RabbitRoutingKey.GUILDS_RESERVATIONS_CREATE_RETRY,
    RabbitRoutingKey.GUILDS_RESERVATIONS_CREATE_DLQ,
  ),
  retryable(
    "gateway-guilds-reservations-delete",
    RabbitRoutingKey.GUILDS_RESERVATIONS_DELETE,
    RabbitRoutingKey.GUILDS_RESERVATIONS_DELETE_RETRY,
    RabbitRoutingKey.GUILDS_RESERVATIONS_DELETE_DLQ,
  ),
  retryable(
    "gateway-guilds-reservations-v2-changed",
    RabbitRoutingKey.GUILDS_RESERVATIONS_CHANGED_V2,
    RabbitRoutingKey.GUILDS_RESERVATIONS_CHANGED_V2_RETRY,
    RabbitRoutingKey.GUILDS_RESERVATIONS_CHANGED_V2_DLQ,
  ),
  retryable(
    "gateway-global-chat-channel-update",
    RabbitRoutingKey.GLOBAL_CHAT_CHANNEL_UPDATE,
    RabbitRoutingKey.GLOBAL_CHAT_CHANNEL_UPDATE_RETRY,
    RabbitRoutingKey.GLOBAL_CHAT_CHANNEL_UPDATE_DLQ,
  ),
  retryable(
    "gateway-global-chat-send-message",
    RabbitRoutingKey.GLOBAL_CHAT_SEND_MESSAGE,
    RabbitRoutingKey.GLOBAL_CHAT_SEND_MESSAGE_RETRY,
    RabbitRoutingKey.GLOBAL_CHAT_SEND_MESSAGE_DLQ,
  ),
  retryable(
    "gateway-guilds-send-message",
    RabbitRoutingKey.GUILDS_SEND_MESSAGE,
    RabbitRoutingKey.GUILDS_SEND_MESSAGE_RETRY,
    RabbitRoutingKey.GUILDS_SEND_MESSAGE_DLQ,
  ),
  retryable(
    "gateway-guilds-members-add",
    RabbitRoutingKey.GUILDS_MEMBERS_ADD,
    RabbitRoutingKey.GUILDS_MEMBERS_ADD_RETRY,
    RabbitRoutingKey.GUILDS_MEMBERS_ADD_DLQ,
  ),
  {
    ...retryable(
      "gateway-guilds-members-update",
      RabbitRoutingKey.GUILDS_MEMBERS_UPDATE,
      RabbitRoutingKey.GUILDS_MEMBERS_UPDATE_RETRY,
      RabbitRoutingKey.GUILDS_MEMBERS_UPDATE_DLQ,
    ),
    prefetch: MEMBER_ACCESS_PREFETCH,
  },
  {
    ...retryable(
      "gateway-guilds-members-remove",
      RabbitRoutingKey.GUILDS_MEMBERS_REMOVE,
      RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_RETRY,
      RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
    ),
    prefetch: MEMBER_ACCESS_PREFETCH,
  },
  {
    ...retryable(
      "gateway-guilds-members-add-role",
      RabbitRoutingKey.GUILDS_MEMBERS_ADD_ROLE,
      RabbitRoutingKey.GUILDS_MEMBERS_ADD_ROLE_RETRY,
      RabbitRoutingKey.GUILDS_MEMBERS_ADD_ROLE_DLQ,
    ),
    prefetch: MEMBER_ACCESS_PREFETCH,
  },
  {
    ...retryable(
      "gateway-guilds-members-remove-role",
      RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_ROLE,
      RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_RETRY,
      RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_DLQ,
    ),
    prefetch: MEMBER_ACCESS_PREFETCH,
  },
  retryable(
    "gateway-guilds-send-notification",
    RabbitRoutingKey.GUILDS_NOTIFICATIONS_SEND,
    RabbitRoutingKey.GUILDS_NOTIFICATIONS_SEND_RETRY,
    RabbitRoutingKey.GUILDS_NOTIFICATIONS_SEND_DLQ,
  ),
  retryable(
    "gateway-guilds-notifications-volunteer",
    RabbitRoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER,
    RabbitRoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER_RETRY,
    RabbitRoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER_DLQ,
    false,
  ),
  retryable(
    "gateway-users-party-ready-room-updated",
    RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED,
    RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED_RETRY,
    RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED_DLQ,
  ),
  retryable(
    "gateway-guilds-party-gathering",
    RabbitRoutingKey.GUILDS_PARTY_GATHERING,
    RabbitRoutingKey.GUILDS_PARTY_GATHERING_RETRY,
    RabbitRoutingKey.GUILDS_PARTY_GATHERING_DLQ,
    false,
  ),
  retryable(
    "gateway-guilds-party-gathering-updated",
    RabbitRoutingKey.GUILDS_PARTY_GATHERING_UPDATED,
    RabbitRoutingKey.GUILDS_PARTY_GATHERING_UPDATED_RETRY,
    RabbitRoutingKey.GUILDS_PARTY_GATHERING_UPDATED_DLQ,
  ),
  {
    queue: "gateway-guilds-party-gathering-cancel",
    routingKey: RabbitRoutingKey.GUILDS_PARTY_GATHERING_CANCEL,
  },
  {
    queue: "gateway-guilds-update-message",
    routingKey: RabbitRoutingKey.GUILDS_UPDATE_MESSAGE,
  },
  {
    queue: "gateway-guilds-delete-message",
    routingKey: RabbitRoutingKey.GUILDS_DELETE_MESSAGE,
  },
  {
    queue: "gateway-guilds-clear-messages",
    routingKey: RabbitRoutingKey.GUILDS_CLEAR_MESSAGES,
  },
  {
    queue: "gateway-guilds-members-refresh-job-update",
    routingKey: RabbitRoutingKey.GUILDS_MEMBERS_REFRESH_JOB_UPDATE,
  },
  {
    queue: "gateway-event-map-status-update",
    routingKey: RabbitRoutingKey.EVENT_MAP_STATUS_UPDATE,
  },
  {
    queue: "gateway-event-hero-killed",
    routingKey: RabbitRoutingKey.EVENT_HERO_KILLED,
  },
  {
    queue: "gateway-event-ranking-update",
    routingKey: RabbitRoutingKey.EVENT_RANKING_UPDATE,
  },
  {
    queue: "gateway-event-respawn-window-opened",
    routingKey: RabbitRoutingKey.EVENT_RESPAWN_WINDOW_OPENED,
  },
  {
    queue: "gateway-event-respawn-window-closed",
    routingKey: RabbitRoutingKey.EVENT_RESPAWN_WINDOW_CLOSED,
  },
  {
    queue: "gateway-presence-check-request",
    routingKey: RabbitRoutingKey.PRESENCE_CHECK_REQUEST,
  },
] as const;

type ConsumedRoutingKey = (typeof consumerSpecs)[number]["routingKey"];

const gatewayConsumerSpecs: ReadonlyArray<
  ConsumerSpec & { readonly routingKey: ConsumedRoutingKey }
> = consumerSpecs;

type BridgeRoute<Key extends ConsumedRoutingKey> = (
  payload: CanonicalRabbitEvent<Key>,
  messageId: string | undefined,
) => Effect.Effect<void, unknown>;

/** One route per consumed routing key; a queue without a route does not compile. */
type BridgeRoutes = { readonly [Key in ConsumedRoutingKey]: BridgeRoute<Key> };

/** Decodes and runs the route of `routingKey`, generic so the two stay correlated. */
const runBridgeRoute = <Key extends ConsumedRoutingKey>(
  routes: BridgeRoutes,
  routingKey: Key,
  serializedPayload: string,
  messageId: string | undefined,
) =>
  routes[routingKey](
    decodeRabbitEventJson(routingKey, serializedPayload),
    messageId,
  );

export const gatewayQueueDefinitions: ReadonlyArray<RabbitQueueDefinition> =
  gatewayConsumerSpecs.flatMap((spec) => {
    const mainBase = {
      name: spec.queue,
      exchange: RabbitExchange.DEFAULT,
      routingKey: spec.routingKey,
      durable: true,
    };

    const main: RabbitQueueDefinition = spec.retryRoutingKey
      ? {
          ...mainBase,
          deadLetterExchange: RabbitExchange.RETRY,
          deadLetterRoutingKey: spec.retryRoutingKey,
        }
      : mainBase;

    if (!spec.retryRoutingKey || !spec.deadLetterRoutingKey) return [main];

    const retryQueue: RabbitQueueDefinition = {
      name: `${spec.queue}.retry`,
      exchange: RabbitExchange.RETRY,
      routingKey: spec.retryRoutingKey,
      durable: true,
      messageTtl: 30_000,
      deadLetterExchange: RabbitExchange.DEFAULT,
      deadLetterRoutingKey: spec.routingKey,
    };

    const deadLetterQueue: RabbitQueueDefinition = {
      name: `${spec.queue}.dlq`,
      exchange: RabbitExchange.DEAD_LETTER,
      routingKey: spec.deadLetterRoutingKey,
      durable: true,
    };

    return spec.installRetryQueue === false
      ? [main, deadLetterQueue]
      : [main, retryQueue, deadLetterQueue];
  });

const gatewayDeadLetterSpecs = gatewayConsumerSpecs.flatMap((spec) =>
  spec.deadLetterRoutingKey
    ? [
        {
          queue: `${spec.queue}.dlq`,
          routingKey: spec.deadLetterRoutingKey,
        },
      ]
    : [],
);

const decodeJsonRecord = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)),
);

const decodeRecord = Schema.decodeUnknownOption(
  Schema.Record(Schema.String, Schema.Unknown),
);

const decodeString = Schema.decodeUnknownOption(Schema.String);

const decodeNumber = Schema.decodeUnknownOption(Schema.Number);

// Identifies a dead-lettered delivery without logging its payload or any
// member's Discord ID. Each field decodes on its own, because a delivery that
// failed validation is the likeliest one to reach the DLQ.
const deadLetterIdentifiers = (content: Uint8Array) => {
  const payload = decodeJsonRecord(new TextDecoder().decode(content));
  const field = (key: string) => Option.map(payload, (data) => data[key]);

  return {
    guildId: Option.getOrUndefined(
      Option.flatMap(field("guildId"), decodeString),
    ),
    notificationId: Option.getOrUndefined(
      Option.flatMap(field("notificationId"), decodeString),
    ),
    revision: Option.getOrUndefined(
      Option.flatMap(field("revision"), decodeNumber),
    ),
    updateType: Option.getOrUndefined(
      field("update").pipe(
        Option.flatMap(decodeRecord),
        Option.flatMap((update) => decodeString(update.type)),
      ),
    ),
  };
};

const record = Schema.decodeUnknownSync(
  Schema.Record(Schema.String, Schema.Unknown),
);

type OrganizationEvent = Exclude<
  Extract<Event, { data: { organizationId: string; payload: unknown } }>,
  { type: "party-gathering.state-updated" }
>;

const organizationEvent = <Payload>(
  type: OrganizationEvent["type"],
  organizationId: string,
  payload: Payload,
): OrganizationEvent & {
  data: { organizationId: string; payload: Payload };
} => ({ v: 1, type, data: { organizationId, payload } });

type GatheringUpdateEnvelope = CanonicalRabbitEvent<
  typeof RabbitRoutingKey.GUILDS_PARTY_GATHERING_UPDATED
>;

// Names the first envelope field the update disagrees with, never its value.
const gatheringUpdateMismatch = (
  data: GatheringUpdateEnvelope,
): string | undefined => {
  const update = data.update;

  if (!data.guildIds.includes(data.guildId)) return "guildIds";

  if (update.type === "REMOVE") {
    if (update.notificationId !== data.notificationId) return "notificationId";

    return update.revision === data.revision ? undefined : "revision";
  }

  const gathering = update.gathering;

  if (gathering.notificationId !== data.notificationId) return "notificationId";

  if (gathering.world !== data.world) return "world";

  if (gathering.revision !== data.revision) return "revision";

  if (!gathering.guildIds.includes(data.guildId)) return "gathering.guildIds";

  if (gathering.npc?.lvl !== data.npc?.lvl) return "npc.lvl";

  if (
    gathering.npc?.type !== undefined &&
    gathering.npc.type !== data.npc?.type
  )
    return "npc.type";

  return undefined;
};

export class RabbitBridge {
  /** Consumes the Gateway's queues for as long as the replica runs. */
  static readonly layer = Layer.effectDiscard(
    Effect.gen(function* () {
      const bridge = new RabbitBridge(
        yield* RabbitMessaging,
        yield* Hub,
        yield* Commands,
        yield* Presence,
        yield* Coverage,
      );

      yield* Effect.acquireRelease(bridge.start(), () =>
        bridge.stop().pipe(Effect.orDie),
      );
    }),
  );

  private consumers: RabbitConsumer[] = [];

  constructor(
    private readonly messaging: RabbitMessagingService,
    private readonly hub: RealtimeHub,
    private readonly commands: Pick<CommandHandler, "rebalanceAcrossInstances">,
    private readonly presence: Pick<PresenceStore, "coverageForMap">,
    private readonly coverage: Pick<CoveragePublisher, "publish">,
  ) {}

  start(): Effect.Effect<void, MessagingError, Scope.Scope> {
    const { messaging, consumers } = this;
    const handle = this.handle.bind(this);

    return Effect.gen(function* () {
      for (const spec of gatewayConsumerSpecs) {
        const consumer = yield* messaging.consume(
          {
            queue: spec.queue,
            prefetch: spec.prefetch ?? 1,
            failurePolicy:
              spec.retryRoutingKey && spec.deadLetterRoutingKey
                ? {
                    strategy: "retry",
                    maxRetries: 3,
                    retryRoutingKey: spec.retryRoutingKey,
                    deadLetterRoutingKey: spec.deadLetterRoutingKey,
                  }
                : { strategy: "nack" },
          },
          (delivery: RabbitDelivery) =>
            handle(
              spec.routingKey,
              new TextDecoder().decode(delivery.content),
              delivery.properties.messageId,
            ),
        );

        consumers.push(consumer);
      }

      for (const spec of gatewayDeadLetterSpecs) {
        const consumer = yield* messaging.consume(
          {
            queue: spec.queue,
            prefetch: 1,
            failurePolicy: { strategy: "requeue" },
          },
          (delivery) =>
            Effect.logError("Gateway RabbitMQ delivery reached DLQ").pipe(
              Effect.annotateLogs({
                queue: spec.queue,
                routingKey: spec.routingKey,
                messageId: delivery.properties.messageId,
                retryCount:
                  delivery.properties.headers?.["x-lootlog-retry-count"] ?? 0,
                ...deadLetterIdentifiers(delivery.content),
              }),
            ),
        );

        consumers.push(consumer);
      }
    });
  }

  stop(): Effect.Effect<void, MessagingError> {
    const consumers = [...this.consumers];

    return Effect.gen(function* () {
      for (const consumer of consumers) yield* consumer.cancel;
    }).pipe(Effect.tap(() => Effect.sync(() => (this.consumers = []))));
  }

  private handle(
    routingKey: ConsumedRoutingKey,
    serializedPayload: string,
    messageId?: string,
  ): Effect.Effect<void, unknown> {
    return runBridgeRoute(
      this.routes,
      routingKey,
      serializedPayload,
      messageId,
    );
  }

  private publish(
    ...args: Parameters<RealtimeHub["publishToScope"]>
  ): Effect.Effect<void, unknown> {
    return Effect.tryPromise({
      try: () => this.hub.publishToScope(...args),
      catch: (cause) => cause,
    });
  }

  private publishTo(
    discordId: string,
    event: Event,
  ): Effect.Effect<void, unknown> {
    return Effect.tryPromise({
      try: () => this.hub.publishToDiscord(discordId, event),
      catch: (cause) => cause,
    });
  }

  private rebalance(
    payload: { readonly discordId: string; readonly userId: string },
    removedOrganizationId?: string,
  ): Effect.Effect<void, unknown> {
    return this.commands.rebalanceAcrossInstances(
      payload.discordId,
      payload.userId,
      removedOrganizationId,
    );
  }

  /** Forwards an Organization's event to the subscribers of one topic. */
  private organizationEvent<Key extends ConsumedRoutingKey>(
    topic: Scope["topic"],
    type: OrganizationEvent["type"],
  ): BridgeRoute<Key> {
    return (payload) => {
      const data = record(payload);

      const organizationId =
        Option.getOrUndefined(decodeString(data.guildId)) ??
        Option.getOrUndefined(decodeString(data.organizationId));

      if (!organizationId) return Effect.void;

      const scope: Types.Mutable<Scope> = { topic, organizationId };
      const eventId = Option.getOrUndefined(decodeString(data.eventId));
      const world = Option.getOrUndefined(decodeString(data.world));

      if (eventId !== undefined) scope.eventId = eventId;

      if (world !== undefined) scope.world = world;

      return this.publish(
        scope,
        organizationEvent(type, organizationId, payload),
      );
    };
  }

  private readonly routes: BridgeRoutes = {
    [RabbitRoutingKey.PRESENCE_CHECK_REQUEST]: ({ guildId, mapName }) =>
      this.presence.coverageForMap(guildId, mapName).pipe(
        Effect.flatMap((presences) =>
          Effect.forEach(
            presences,
            (presence) =>
              this.coverage.publish({
                guildId,
                mapName,
                discordId: presence.discordId,
                hasPlayer: true,
                isAfk: presence.isAfk,
              }),
            { concurrency: "unbounded", discard: true },
          ),
        ),
      ),
    [RabbitRoutingKey.GUILDS_MEMBERS_UPDATE]: (payload) =>
      this.rebalance(payload),
    [RabbitRoutingKey.GUILDS_MEMBERS_ADD_ROLE]: (payload) =>
      this.rebalance(payload),
    [RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_ROLE]: (payload) =>
      this.rebalance(payload),
    [RabbitRoutingKey.GUILDS_MEMBERS_REMOVE]: (payload) =>
      this.rebalance(payload, payload.guildId),
    // Access comes with a role, which its own event rebalances.
    [RabbitRoutingKey.GUILDS_MEMBERS_ADD]: () => Effect.void,
    [RabbitRoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER]: (data) =>
      this.publishTo(data.targetDiscordId, {
        v: 1,
        type: "notification.volunteer",
        data: {
          notificationId: data.notificationId,
          volunteer: {
            ...record(data.character),
            discordId: data.volunteerDiscordId,
            world: data.world,
          },
        },
      }),
    [RabbitRoutingKey.GUILDS_KILLS_ACCEPTED_V1]: (data, messageId) => {
      const scope = {
        topic: "organization.loots" as const,
        organizationId: data.guildId,
      };

      const audience = {
        recipientPlatform: "web-app" as const,
        sourceNpcs: data.sourceNpcs ?? [
          { level: data.npc.lvl, type: data.npc.type },
        ],
      };

      const feedEntry =
        data.feedEntry &&
        data.feedEntry.guild.id === data.guildId &&
        data.feedEntry.type === "kill"
          ? data.feedEntry
          : undefined;

      return this.publish(
        scope,
        { v: 1, type: "kills.changed", data: { guildId: data.guildId } },
        messageId,
        audience,
      ).pipe(
        Effect.andThen(
          feedEntry
            ? this.publish(
                scope,
                { v: 1, type: "feed.entry", data: feedEntry },
                messageId ? `${messageId}:feed` : undefined,
                audience,
              )
            : Effect.void,
        ),
      );
    },
    [RabbitRoutingKey.GUILDS_LOOTS_CREATE]: (
      { feedEntry, loot, ...data },
      messageId,
    ) => {
      const scope = {
        topic: "organization.loots" as const,
        organizationId: data.guildId,
      };

      const lootFeedEntry =
        feedEntry &&
        feedEntry.guild.id === data.guildId &&
        feedEntry.type === "loot"
          ? feedEntry
          : undefined;

      // Web sessions read the snapshot and game sessions the summary; both
      // deliver locally before either awaits federation.
      return Effect.all(
        [
          this.publish(
            scope,
            {
              v: 1,
              type: "loot.snapshot",
              data: loot ? { ...data, loot } : data,
            },
            messageId,
            { recipientPlatform: "web-app" },
          ),
          this.publish(scope, { v: 1, type: "loot.created", data }, messageId),
        ],
        { concurrency: "unbounded", discard: true },
      ).pipe(
        Effect.andThen(
          lootFeedEntry
            ? this.publish(
                scope,
                { v: 1, type: "feed.entry", data: lootFeedEntry },
                messageId ? `${messageId}:feed` : undefined,
                {
                  recipientPlatform: "web-app",
                  sourceNpcs: lootEventVisibilityNpcs(data.npcs),
                },
              )
            : Effect.void,
        ),
      );
    },
    [RabbitRoutingKey.GUILDS_LOOTS_SHARE_UPDATE]: (data) =>
      this.publish(
        { topic: "organization.loots", organizationId: data.guildId },
        { v: 1, type: "loot.share-updated", data },
      ),
    [RabbitRoutingKey.GUILDS_RESERVATIONS_CHANGED_V2]: (data) =>
      Effect.forEach(
        new Set(data.audienceGuildIds),
        (organizationId) =>
          this.publish(
            { topic: "organization.reservations", organizationId },
            { v: 1, type: "reservation.changed", data },
          ),
        { discard: true },
      ),
    [RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED]: (data) =>
      Effect.forEach(
        data.eligibleGuildIds,
        (id) =>
          this.publishTo(
            data.recipientDiscordId,
            organizationEvent("party-ready-room.updated", id, data.update),
          ),
        { discard: true },
      ),
    [RabbitRoutingKey.GLOBAL_CHAT_SEND_MESSAGE]: (data) =>
      this.publish(
        globalChatScope(data.world),
        { v: 1, type: "global-chat.created", data },
        data.id,
      ),
    [RabbitRoutingKey.GLOBAL_CHAT_CHANNEL_UPDATE]: (data, messageId) =>
      this.publish(
        globalChatScope(data.world),
        globalChatChannelEvent(data),
        messageId,
      ),
    [RabbitRoutingKey.GUILDS_PARTY_GATHERING_UPDATED]: (data, messageId) =>
      this.publishGatheringUpdate(data, messageId),
    [RabbitRoutingKey.GUILDS_TIMERS_UPDATE]: this.organizationEvent(
      "organization.timers",
      "timer.created",
    ),
    [RabbitRoutingKey.GUILDS_TIMERS_DELETE]: this.organizationEvent(
      "organization.timers",
      "timer.deleted",
    ),
    [RabbitRoutingKey.GUILDS_HERO_SIGHTINGS_UPDATE]: this.organizationEvent(
      "organization.timers",
      "hero-sighting.updated",
    ),
    [RabbitRoutingKey.GUILDS_RESERVATIONS_CREATE]: this.organizationEvent(
      "organization.reservations",
      "reservation.created",
    ),
    [RabbitRoutingKey.GUILDS_RESERVATIONS_DELETE]: this.organizationEvent(
      "organization.reservations",
      "reservation.deleted",
    ),
    [RabbitRoutingKey.GUILDS_SEND_MESSAGE]: this.organizationEvent(
      "organization.chat",
      "chat.created",
    ),
    [RabbitRoutingKey.GUILDS_UPDATE_MESSAGE]: this.organizationEvent(
      "organization.chat",
      "chat.updated",
    ),
    [RabbitRoutingKey.GUILDS_DELETE_MESSAGE]: this.organizationEvent(
      "organization.chat",
      "chat.deleted",
    ),
    [RabbitRoutingKey.GUILDS_CLEAR_MESSAGES]: this.organizationEvent(
      "organization.chat",
      "chat.cleared",
    ),
    [RabbitRoutingKey.GUILDS_NOTIFICATIONS_SEND]: this.organizationEvent(
      "organization.notifications",
      "notification.sent",
    ),
    [RabbitRoutingKey.GUILDS_PARTY_GATHERING]: this.organizationEvent(
      "organization.notifications",
      "party-gathering.updated",
    ),
    [RabbitRoutingKey.GUILDS_PARTY_GATHERING_CANCEL]: this.organizationEvent(
      "organization.notifications",
      "party-gathering.cancelled",
    ),
    [RabbitRoutingKey.GUILDS_MEMBERS_REFRESH_JOB_UPDATE]:
      this.organizationEvent("organization.members", "member-refresh.updated"),
    [RabbitRoutingKey.EVENT_MAP_STATUS_UPDATE]: this.organizationEvent(
      "event.coordination",
      "event.map-status-updated",
    ),
    [RabbitRoutingKey.EVENT_HERO_KILLED]: this.organizationEvent(
      "event.coordination",
      "event.hero-killed",
    ),
    [RabbitRoutingKey.EVENT_RANKING_UPDATE]: this.organizationEvent(
      "event.coordination",
      "event.ranking-updated",
    ),
    [RabbitRoutingKey.EVENT_RESPAWN_WINDOW_OPENED]: this.organizationEvent(
      "event.coordination",
      "event.respawn-window-opened",
    ),
    [RabbitRoutingKey.EVENT_RESPAWN_WINDOW_CLOSED]: this.organizationEvent(
      "event.coordination",
      "event.respawn-window-closed",
    ),
  };

  private publishGatheringUpdate(
    data: GatheringUpdateEnvelope,
    messageId?: string,
  ): Effect.Effect<void, unknown> {
    const update = data.update;
    const mismatch = gatheringUpdateMismatch(data);

    if (mismatch)
      return Effect.fail(
        new Error(
          `Gathering update does not match its source: ${mismatch} differs`,
        ),
      );

    const clientUpdate: typeof update =
      update.type === "UPSERT"
        ? {
            type: "UPSERT",
            gathering: {
              ...update.gathering,
              // The frame schema rejects a present but undefined npc, which a
              // gathering announced with a message instead of an NPC would carry.
              ...(data.npc && { npc: data.npc }),
              guildIds: [data.guildId],
            },
          }
        : update;

    return Effect.tryPromise({
      try: () =>
        this.hub.publishToScope(
          {
            topic: "organization.chat",
            organizationId: data.guildId,
            world: data.world,
          },
          {
            v: 1,
            type: "party-gathering.state-updated",
            data: { organizationId: data.guildId, payload: clientUpdate },
          },
          messageId ?? `${data.notificationId}:${data.revision}`,
          {
            discordId: data.organizerDiscordId,
            partyGatheringSource: {
              guildId: data.guildId,
              world: data.world,
              notificationId: data.notificationId,
              organizerDiscordId: data.organizerDiscordId,
              npc: data.npc,
            },
          },
        ),
      catch: (cause) => cause,
    });
  }
}
