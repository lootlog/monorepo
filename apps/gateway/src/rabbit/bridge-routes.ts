import { lootEventVisibilityNpcs } from "#src/realtime/source-event-visibility";
import type { CanonicalRabbitEvent } from "@lootlog/protocol/rabbit/events";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import type {
  ServerEvent,
  SubscriptionScope,
} from "@lootlog/protocol/realtime";
import type { GlobalChatChannelUpdate } from "@lootlog/schema/chat";
import { Effect, Option, Schema, type Types } from "effect";
import type { CommandHandler } from "#src/realtime/command-handler";
import { globalChatScope, type RealtimeHub } from "#src/realtime/realtime-hub";
import type { PresenceStore } from "#src/realtime/presence-store";
import type { CoveragePublisher } from "#src/rabbit/coverage-publisher";
import type { ConsumedRoutingKey } from "#src/rabbit/gateway-queues";

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

type BridgeRoute<Key extends ConsumedRoutingKey> = (
  payload: CanonicalRabbitEvent<Key>,
  messageId: string | undefined,
) => Effect.Effect<void, unknown>;

/** One route per consumed routing key; a queue without a route does not compile. */
export type BridgeRoutes = {
  readonly [Key in ConsumedRoutingKey]: BridgeRoute<Key>;
};

/** Runs the route of `routingKey`, generic so the two stay correlated. */
export const runBridgeRoute = <Key extends ConsumedRoutingKey>(
  routes: BridgeRoutes,
  routingKey: Key,
  payload: CanonicalRabbitEvent<Key>,
  messageId: string | undefined,
) => routes[routingKey](payload, messageId);

const decodeString = Schema.decodeUnknownOption(Schema.String);

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

const publishGatheringUpdate = (
  hub: Pick<RealtimeHub, "publishToScope">,
  data: GatheringUpdateEnvelope,
  messageId?: string,
): Effect.Effect<void, unknown> => {
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
      hub.publishToScope(
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
};

export interface BridgeRouteDependencies {
  readonly hub: Pick<
    RealtimeHub,
    "publishToScope" | "publishToDiscord" | "publishToUser"
  >;
  readonly commands: Pick<CommandHandler, "rebalanceAcrossInstances">;
  readonly presence: Pick<PresenceStore, "coverageForMap">;
  readonly coverage: Pick<CoveragePublisher, "publish">;
}

/** What each consumed routing key delivers to this replica's sessions. */
export const gatewayBridgeRoutes = ({
  hub,
  commands,
  presence,
  coverage,
}: BridgeRouteDependencies): BridgeRoutes => {
  const publish = (
    ...args: Parameters<RealtimeHub["publishToScope"]>
  ): Effect.Effect<void, unknown> =>
    Effect.tryPromise({
      try: () => hub.publishToScope(...args),
      catch: (cause) => cause,
    });

  const publishTo = (
    discordId: string,
    event: Event,
  ): Effect.Effect<void, unknown> =>
    Effect.tryPromise({
      try: () => hub.publishToDiscord(discordId, event),
      catch: (cause) => cause,
    });

  const rebalance = (
    payload: { readonly discordId: string; readonly userId: string },
    removedOrganizationId?: string,
  ): Effect.Effect<void, unknown> =>
    commands.rebalanceAcrossInstances(
      payload.discordId,
      payload.userId,
      removedOrganizationId,
    );

  /** Forwards an Organization's event to the subscribers of one topic. */
  const organizationRoute =
    <Key extends ConsumedRoutingKey>(
      topic: Scope["topic"],
      type: OrganizationEvent["type"],
    ): BridgeRoute<Key> =>
    (payload) => {
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

      return publish(scope, organizationEvent(type, organizationId, payload));
    };

  return {
    [RabbitRoutingKey.PRESENCE_CHECK_REQUEST]: ({ guildId, mapName }) =>
      presence.coverageForMap(guildId, mapName).pipe(
        Effect.flatMap((presences) =>
          Effect.forEach(
            presences,
            (presence) =>
              coverage.publish({
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
    [RabbitRoutingKey.GUILDS_MEMBERS_UPDATE]: (payload) => rebalance(payload),
    [RabbitRoutingKey.GUILDS_MEMBERS_REMOVE]: (payload) =>
      rebalance(payload, payload.guildId),
    [RabbitRoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER]: (data) =>
      publishTo(data.targetDiscordId, {
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

      return publish(
        scope,
        { v: 1, type: "kills.changed", data: { guildId: data.guildId } },
        messageId,
        audience,
      ).pipe(
        Effect.andThen(
          feedEntry
            ? publish(
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
          publish(
            scope,
            {
              v: 1,
              type: "loot.snapshot",
              data: loot ? { ...data, loot } : data,
            },
            messageId,
            { recipientPlatform: "web-app" },
          ),
          publish(scope, { v: 1, type: "loot.created", data }, messageId),
        ],
        { concurrency: "unbounded", discard: true },
      ).pipe(
        Effect.andThen(
          lootFeedEntry
            ? publish(
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
      publish(
        { topic: "organization.loots", organizationId: data.guildId },
        { v: 1, type: "loot.share-updated", data },
      ),
    [RabbitRoutingKey.GUILDS_RESERVATIONS_CHANGED_V2]: (data) =>
      Effect.forEach(
        new Set(data.audienceGuildIds),
        (organizationId) =>
          publish(
            { topic: "organization.reservations", organizationId },
            { v: 1, type: "reservation.changed", data },
          ),
        { concurrency: "unbounded", discard: true },
      ),
    // Delivery skips clients that did not join with KILL_STATS_FEATURE.
    [RabbitRoutingKey.USERS_KILL_STATS_CHANGED]: (data) =>
      Effect.tryPromise({
        try: () =>
          hub.publishToUser(data.recipientUserId, {
            v: 1,
            type: "kill-stats.changed",
            data: {},
          }),
        catch: (cause) => cause,
      }),
    [RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED]: (data) =>
      Effect.forEach(
        data.eligibleGuildIds,
        (id) =>
          publishTo(
            data.recipientDiscordId,
            organizationEvent("party-ready-room.updated", id, data.update),
          ),
        { concurrency: "unbounded", discard: true },
      ),
    [RabbitRoutingKey.GLOBAL_CHAT_SEND_MESSAGE]: (data) =>
      publish(
        globalChatScope(data.world),
        { v: 1, type: "global-chat.created", data },
        data.id,
      ),
    // Each change carries the accounts' current auras, so a redelivery
    // sets the same state again.
    [RabbitRoutingKey.CHARACTER_AURAS_CHANGED]: (data, messageId) =>
      publish(
        { topic: "global.character-auras" },
        { v: 1, type: "character-auras.changed", data },
        messageId,
      ),
    [RabbitRoutingKey.GLOBAL_CHAT_CHANNEL_UPDATE]: (data, messageId) =>
      publish(
        globalChatScope(data.world),
        globalChatChannelEvent(data),
        messageId,
      ),
    [RabbitRoutingKey.GUILDS_PARTY_GATHERING_UPDATED]: (data, messageId) =>
      publishGatheringUpdate(hub, data, messageId),
    [RabbitRoutingKey.GUILDS_TIMERS_UPDATE]: organizationRoute(
      "organization.timers",
      "timer.created",
    ),
    [RabbitRoutingKey.GUILDS_TIMERS_DELETE]: organizationRoute(
      "organization.timers",
      "timer.deleted",
    ),
    [RabbitRoutingKey.GUILDS_HERO_SIGHTINGS_UPDATE]: organizationRoute(
      "organization.timers",
      "hero-sighting.updated",
    ),
    [RabbitRoutingKey.GUILDS_RESERVATIONS_CREATE]: organizationRoute(
      "organization.reservations",
      "reservation.created",
    ),
    [RabbitRoutingKey.GUILDS_RESERVATIONS_DELETE]: organizationRoute(
      "organization.reservations",
      "reservation.deleted",
    ),
    [RabbitRoutingKey.GUILDS_SEND_MESSAGE]: organizationRoute(
      "organization.chat",
      "chat.created",
    ),
    [RabbitRoutingKey.GUILDS_UPDATE_MESSAGE]: organizationRoute(
      "organization.chat",
      "chat.updated",
    ),
    [RabbitRoutingKey.GUILDS_DELETE_MESSAGE]: organizationRoute(
      "organization.chat",
      "chat.deleted",
    ),
    [RabbitRoutingKey.GUILDS_CLEAR_MESSAGES]: organizationRoute(
      "organization.chat",
      "chat.cleared",
    ),
    [RabbitRoutingKey.GUILDS_NOTIFICATIONS_SEND]: organizationRoute(
      "organization.notifications",
      "notification.sent",
    ),
    [RabbitRoutingKey.GUILDS_NOTIFICATIONS_GOING]: organizationRoute(
      "organization.notifications",
      "notification.going",
    ),
    [RabbitRoutingKey.GUILDS_PARTY_GATHERING]: organizationRoute(
      "organization.notifications",
      "party-gathering.updated",
    ),
    [RabbitRoutingKey.GUILDS_PARTY_GATHERING_CANCEL]: organizationRoute(
      "organization.notifications",
      "party-gathering.cancelled",
    ),
    [RabbitRoutingKey.GUILDS_MEMBERS_REFRESH_JOB_UPDATE]: organizationRoute(
      "organization.members",
      "member-refresh.updated",
    ),
    [RabbitRoutingKey.EVENT_MAP_STATUS_UPDATE]: organizationRoute(
      "event.coordination",
      "event.map-status-updated",
    ),
    [RabbitRoutingKey.EVENT_HERO_KILLED]: organizationRoute(
      "event.coordination",
      "event.hero-killed",
    ),
    [RabbitRoutingKey.EVENT_RANKING_UPDATE]: organizationRoute(
      "event.coordination",
      "event.ranking-updated",
    ),
    [RabbitRoutingKey.EVENT_RESPAWN_WINDOW_OPENED]: organizationRoute(
      "event.coordination",
      "event.respawn-window-opened",
    ),
    [RabbitRoutingKey.EVENT_RESPAWN_WINDOW_CLOSED]: organizationRoute(
      "event.coordination",
      "event.respawn-window-closed",
    ),
  };
};
