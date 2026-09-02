import {
  type MessagingError,
  type RabbitMessagingService,
  type RabbitConsumer,
  type RabbitDelivery,
} from "@lootlog/messaging";
import {
  decodeRabbitEvent,
  type GuildLootCreatedEventV2,
  type GuildLootShareUpdatedEventV2,
  type ReservationChangedEventV2,
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
import { Effect, type Scope } from "effect";
import type { CommandHandler } from "#src/realtime/command-handler";
import type { RealtimeHub } from "#src/realtime/realtime-hub";
import type { PresenceStore } from "#src/realtime/presence-store";
import type { CoveragePublisher } from "#src/rabbit/coverage-publisher";

type Event = typeof ServerEvent.Type;
type Scope = typeof SubscriptionScope.Type;

interface ConsumerSpec {
  readonly queue: string;
  readonly routingKey: RabbitRoutingKeyName;
  readonly retryRoutingKey?: RabbitRoutingKeyName;
  readonly deadLetterRoutingKey?: RabbitRoutingKeyName;
  readonly installRetryQueue?: boolean;
}

const retryable = (
  queue: string,
  routingKey: RabbitRoutingKeyName,
  retryRoutingKey: RabbitRoutingKeyName,
  deadLetterRoutingKey: RabbitRoutingKeyName,
  installRetryQueue = true,
): ConsumerSpec => ({
  queue,
  routingKey,
  retryRoutingKey,
  deadLetterRoutingKey,
  installRetryQueue,
});

export const gatewayConsumerSpecs: ReadonlyArray<ConsumerSpec> = [
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
  retryable(
    "gateway-guilds-members-update",
    RabbitRoutingKey.GUILDS_MEMBERS_UPDATE,
    RabbitRoutingKey.GUILDS_MEMBERS_UPDATE_RETRY,
    RabbitRoutingKey.GUILDS_MEMBERS_UPDATE_DLQ,
  ),
  retryable(
    "gateway-guilds-members-remove",
    RabbitRoutingKey.GUILDS_MEMBERS_REMOVE,
    RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_RETRY,
    RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
  ),
  retryable(
    "gateway-guilds-members-add-role",
    RabbitRoutingKey.GUILDS_MEMBERS_ADD_ROLE,
    RabbitRoutingKey.GUILDS_MEMBERS_ADD_ROLE_RETRY,
    RabbitRoutingKey.GUILDS_MEMBERS_ADD_ROLE_DLQ,
  ),
  retryable(
    "gateway-guilds-members-remove-role",
    RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_ROLE,
    RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_RETRY,
    RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_DLQ,
  ),
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
];

export const gatewayQueueDefinitions: ReadonlyArray<RabbitQueueDefinition> =
  gatewayConsumerSpecs.flatMap((spec) => {
    const main: RabbitQueueDefinition = {
      name: spec.queue,
      exchange: RabbitExchange.DEFAULT,
      routingKey: spec.routingKey,
      durable: true,
      ...(spec.retryRoutingKey
        ? {
            deadLetterExchange: RabbitExchange.RETRY,
            deadLetterRoutingKey: spec.retryRoutingKey,
          }
        : {}),
    };
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

export const gatewayDeadLetterSpecs = gatewayConsumerSpecs.flatMap((spec) =>
  spec.deadLetterRoutingKey
    ? [
        {
          queue: `${spec.queue}.dlq`,
          routingKey: spec.deadLetterRoutingKey,
        },
      ]
    : [],
);

const parseJson = (delivery: RabbitDelivery): unknown =>
  JSON.parse(new TextDecoder().decode(delivery.content));

const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("RabbitMQ payload must be an object");
  }
  return value as Record<string, unknown>;
};

const requiredString = (value: unknown, field: string): string => {
  const candidate = record(value)[field];
  if (typeof candidate !== "string" || candidate.length === 0) {
    throw new Error(`RabbitMQ payload requires ${field}`);
  }
  return candidate;
};

const organizationEvent = (
  type: Extract<Event, { data: { organizationId: string } }>["type"],
  organizationId: string,
  payload: unknown,
): Event => ({ v: 1, type, data: { organizationId, payload } }) as Event;

export class RabbitBridge {
  private consumers: RabbitConsumer[] = [];

  constructor(
    private readonly messaging: RabbitMessagingService,
    private readonly hub: RealtimeHub,
    private readonly commands: CommandHandler,
    private readonly presence: PresenceStore,
    private readonly coverage: CoveragePublisher,
  ) {}

  start(): Effect.Effect<void, MessagingError, Scope.Scope> {
    const { messaging, consumers } = this;
    const handle = this.handle.bind(this);
    return Effect.gen(function* () {
      for (const spec of gatewayConsumerSpecs) {
        const consumer = yield* messaging.consume(
          {
            queue: spec.queue,
            prefetch: 1,
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
            Effect.tryPromise({
              try: () => handle(spec.routingKey, parseJson(delivery)),
              catch: (cause) => cause,
            }),
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
                retryCount:
                  delivery.properties.headers?.["x-lootlog-retry-count"] ?? 0,
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

  private async handle(
    routingKey: RabbitRoutingKeyName,
    payload: unknown,
  ): Promise<void> {
    if (routingKey === RabbitRoutingKey.PRESENCE_CHECK_REQUEST) {
      const guildId = requiredString(payload, "guildId");
      const mapName = requiredString(payload, "mapName");
      const presences = await this.presence.coverageForMap(guildId, mapName);
      await Promise.all(
        presences.map((presence) =>
          this.coverage.publish({
            guildId,
            mapName,
            discordId: presence.discordId,
            hasPlayer: true,
            isAfk: presence.isAfk,
          }),
        ),
      );
      return;
    }
    if (
      routingKey === RabbitRoutingKey.GUILDS_MEMBERS_UPDATE ||
      routingKey === RabbitRoutingKey.GUILDS_MEMBERS_REMOVE ||
      routingKey === RabbitRoutingKey.GUILDS_MEMBERS_ADD_ROLE ||
      routingKey === RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_ROLE
    ) {
      await this.commands.rebalanceAcrossInstances(
        requiredString(payload, "discordId"),
        requiredString(payload, "userId"),
      );
      return;
    }
    if (routingKey === RabbitRoutingKey.GUILDS_MEMBERS_ADD) return;

    if (routingKey === RabbitRoutingKey.GUILDS_LOOTS_CREATE) {
      const data = decodeRabbitEvent(
        routingKey,
        payload,
      ) as GuildLootCreatedEventV2;
      await this.hub.publishToScope(
        { topic: "organization.loots", organizationId: data.guildId },
        { v: 1, type: "loot.created", data },
      );
      return;
    }
    if (routingKey === RabbitRoutingKey.GUILDS_LOOTS_SHARE_UPDATE) {
      const data = decodeRabbitEvent(
        routingKey,
        payload,
      ) as GuildLootShareUpdatedEventV2;
      await this.hub.publishToScope(
        { topic: "organization.loots", organizationId: data.guildId },
        { v: 1, type: "loot.share-updated", data },
      );
      return;
    }
    if (routingKey === RabbitRoutingKey.GUILDS_RESERVATIONS_CHANGED_V2) {
      const data = decodeRabbitEvent(
        routingKey,
        payload,
      ) as ReservationChangedEventV2;
      for (const organizationId of new Set(data.audienceGuildIds)) {
        await this.hub.publishToScope(
          { topic: "organization.reservations", organizationId },
          { v: 1, type: "reservation.changed", data },
        );
      }
      return;
    }

    const data = record(payload);
    const organizationId =
      typeof data.guildId === "string"
        ? data.guildId
        : typeof data.organizationId === "string"
          ? data.organizationId
          : undefined;

    if (routingKey === RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED) {
      const recipientDiscordId = requiredString(data, "recipientDiscordId");
      const eligible = Array.isArray(data.eligibleGuildIds)
        ? data.eligibleGuildIds.filter(
            (id): id is string => typeof id === "string",
          )
        : [];
      for (const id of eligible) {
        await this.hub.publishToDiscord(
          recipientDiscordId,
          organizationEvent("party-ready-room.updated", id, data.update),
        );
      }
      return;
    }
    if (!organizationId) return;

    const routed = this.routeOrganizationEvent(
      routingKey,
      organizationId,
      payload,
    );
    if (!routed) return;
    await this.hub.publishToScope(routed.scope, routed.event);
  }

  private routeOrganizationEvent(
    routingKey: RabbitRoutingKeyName,
    organizationId: string,
    payload: unknown,
  ): { readonly scope: Scope; readonly event: Event } | null {
    const definitions: Partial<
      Record<
        RabbitRoutingKeyName,
        { readonly topic: Scope["topic"]; readonly type: Event["type"] }
      >
    > = {
      [RabbitRoutingKey.GUILDS_TIMERS_UPDATE]: {
        topic: "organization.timers",
        type: "timer.created",
      },
      [RabbitRoutingKey.GUILDS_TIMERS_DELETE]: {
        topic: "organization.timers",
        type: "timer.deleted",
      },
      [RabbitRoutingKey.GUILDS_RESERVATIONS_CREATE]: {
        topic: "organization.reservations",
        type: "reservation.created",
      },
      [RabbitRoutingKey.GUILDS_RESERVATIONS_DELETE]: {
        topic: "organization.reservations",
        type: "reservation.deleted",
      },
      [RabbitRoutingKey.GUILDS_SEND_MESSAGE]: {
        topic: "organization.chat",
        type: "chat.created",
      },
      [RabbitRoutingKey.GUILDS_UPDATE_MESSAGE]: {
        topic: "organization.chat",
        type: "chat.updated",
      },
      [RabbitRoutingKey.GUILDS_DELETE_MESSAGE]: {
        topic: "organization.chat",
        type: "chat.deleted",
      },
      [RabbitRoutingKey.GUILDS_CLEAR_MESSAGES]: {
        topic: "organization.chat",
        type: "chat.cleared",
      },
      [RabbitRoutingKey.GUILDS_NOTIFICATIONS_SEND]: {
        topic: "organization.notifications",
        type: "notification.sent",
      },
      [RabbitRoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER]: {
        topic: "organization.notifications",
        type: "notification.sent",
      },
      [RabbitRoutingKey.GUILDS_PARTY_GATHERING]: {
        topic: "organization.notifications",
        type: "party-gathering.updated",
      },
      [RabbitRoutingKey.GUILDS_PARTY_GATHERING_CANCEL]: {
        topic: "organization.notifications",
        type: "party-gathering.cancelled",
      },
      [RabbitRoutingKey.GUILDS_MEMBERS_REFRESH_JOB_UPDATE]: {
        topic: "organization.members",
        type: "member-refresh.updated",
      },
      [RabbitRoutingKey.EVENT_MAP_STATUS_UPDATE]: {
        topic: "event.coordination",
        type: "event.map-status-updated",
      },
      [RabbitRoutingKey.EVENT_HERO_KILLED]: {
        topic: "event.coordination",
        type: "event.hero-killed",
      },
      [RabbitRoutingKey.EVENT_RANKING_UPDATE]: {
        topic: "event.coordination",
        type: "event.ranking-updated",
      },
      [RabbitRoutingKey.EVENT_RESPAWN_WINDOW_OPENED]: {
        topic: "event.coordination",
        type: "event.respawn-window-opened",
      },
      [RabbitRoutingKey.EVENT_RESPAWN_WINDOW_CLOSED]: {
        topic: "event.coordination",
        type: "event.respawn-window-closed",
      },
    };
    const definition = definitions[routingKey];
    if (!definition) return null;
    const payloadRecord = record(payload);
    const eventId = payloadRecord.eventId;
    const world = payloadRecord.world;
    return {
      scope: {
        topic: definition.topic,
        organizationId,
        ...(typeof eventId === "string" ? { eventId } : {}),
        ...(typeof world === "string" ? { world } : {}),
      },
      event: organizationEvent(
        definition.type as never,
        organizationId,
        payload,
      ),
    };
  }
}
