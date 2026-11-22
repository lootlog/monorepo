import { withAdapterSpan } from "@lootlog/instrumentation/operation";
import { ignorePublicationFailure } from "#src/shared/best-effort-publication";
import { slidingWindowRateLimitScript } from "@lootlog/database/sliding-window-rate-limit";
import type { PartyGatheringNpc } from "@lootlog/schema/party-ready-room";
import type { CanonicalRabbitEvent } from "@lootlog/protocol/rabbit/events";
import {
  selectAccessibleGuildRoles,
  selectAccessibleGuilds,
} from "#src/members/member-access-query";
import {
  canReadNpcFeatureSource,
  NOTIFICATION_SEND_PERMISSIONS,
  NPC_FEATURE_PERMISSIONS,
} from "@lootlog/domain/npc-permissions";
import {
  getNpcRoutingTier,
  isRoutableNpcSource,
} from "@lootlog/domain/npc-routing";
import {
  NotificationGoingPlayerSchema,
  type NotificationGoingPlayer,
} from "@lootlog/schema/notification-going";
import { NpcRoutingDataSchema } from "@lootlog/schema/npc-routing";
import { randomUUID } from "node:crypto";

import { Clock, Effect, Layer, Option, Schema } from "effect";
import type { RedisError } from "effect/persistence/Redis";
import { getNpcType } from "@lootlog/domain/npc-type";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { ApiDatabase } from "#src/database/drizzle/database";

import {
  InvalidRequestError,
  PermissionDeniedError,
  DependencyUnavailableError,
  RateLimitedError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import { MessagingData, MessagingOperationError } from "./messaging-data.js";
import type {
  NotificationGoingRequest,
  SendNotificationRequest,
  VolunteerForPartyRequest,
} from "#src/contracts/messaging/schemas";

const NOTIFICATION_TTL_SECONDS = 1800;

export const NOTIFICATION_RATE_LIMIT_WINDOW_MS = 5_000;

export const NOTIFICATION_RATE_LIMIT_MAX_ATTEMPTS = 5;

export const buildNotificationRateLimitKey = (userId: string) =>
  `messaging:notification-rate:${userId}`;

const buildGoingRateLimitKey = (userId: string) =>
  `messaging:notification-going-rate:${userId}`;

const RATE_LIMIT_SCRIPT = slidingWindowRateLimitScript({
  refreshExpiryOnReject: false,
  includeTimestamp: false,
});

const NotificationMetadataSchema = Schema.Struct({
  discordId: Schema.String,
  userId: Schema.optionalKey(Schema.String),
  guildIds: Schema.Array(Schema.String),
  createdAt: Schema.String,
  world: Schema.optionalKey(Schema.String),
  npcName: Schema.optionalKey(Schema.String),
  npcId: Schema.optionalKey(Schema.Finite),
  npc: Schema.optionalKey(
    Schema.Struct({ ...NpcRoutingDataSchema.fields, lvl: Schema.Finite }),
  ),
});

type NotificationMetadata = typeof NotificationMetadataSchema.Type;

const NotificationMetadataJson = Schema.fromJsonString(
  NotificationMetadataSchema,
);

const goingKey = (notificationId: string, guildId: string) =>
  `notification:${notificationId}:going:${guildId}`;

const UPDATE_GOING_SCRIPT = `
if ARGV[1] == "1" then
  redis.call("hset", KEYS[1], ARGV[2], ARGV[3])
else
  redis.call("hdel", KEYS[1], ARGV[2])
end
if redis.call("exists", KEYS[1]) == 1 then
  redis.call("expire", KEYS[1], ARGV[4])
end
return redis.call("hvals", KEYS[1])
`;

const decodeGoingValues = Schema.decodeUnknownEffect(
  Schema.Array(Schema.String),
);

const decodeGoingPlayer = Schema.decodeUnknownOption(
  Schema.fromJsonString(NotificationGoingPlayerSchema),
);

const parseGoingPlayers = (
  values: ReadonlyArray<string>,
): NotificationGoingPlayer[] =>
  values.flatMap((value) => Option.toArray(decodeGoingPlayer(value)));

const decodeNotificationMetadata = Schema.decodeUnknownSync(
  NotificationMetadataJson,
);

export interface MessagingRedis {
  readonly get: (key: string) => Effect.Effect<string | null, unknown>;
  readonly set: (
    key: string,
    value: string,
    ttl: number,
  ) => Effect.Effect<void, RedisError>;
  readonly eval: (
    script: string,
    keys: ReadonlyArray<string>,
    arguments_: ReadonlyArray<string | number>,
  ) => Effect.Effect<unknown, RedisError>;
}

export interface MessagingEvents {
  readonly publish: <
    Key extends
      | typeof RabbitRoutingKey.GUILDS_NOTIFICATIONS_SEND
      | typeof RabbitRoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER
      | typeof RabbitRoutingKey.GUILDS_NOTIFICATIONS_GOING,
  >(
    routingKey: Key,
    payload: CanonicalRabbitEvent<Key>,
  ) => Effect.Effect<void, unknown>;
}

export interface MessagingReadyRoom {
  readonly create: (input: {
    readonly npc?: PartyGatheringNpc;
    readonly notificationId: string;
    readonly organizerDiscordId: string;
    readonly organizerCharacter: NonNullable<
      SendNotificationRequest["character"]
    >;
    readonly guildId: string;
    readonly world: string;
  }) => Effect.Effect<void, unknown>;
}

export type NotificationRateLimitOutcome =
  | { readonly accepted: true }
  | { readonly accepted: false; readonly retryAfterMs: number };

const consumeRateLimit = (
  redis: Pick<MessagingRedis, "eval">,
  key: string,
): Effect.Effect<NotificationRateLimitOutcome, DependencyUnavailableError> =>
  redis
    .eval(
      RATE_LIMIT_SCRIPT,
      [key],
      [
        NOTIFICATION_RATE_LIMIT_WINDOW_MS,
        NOTIFICATION_RATE_LIMIT_MAX_ATTEMPTS,
        randomUUID(),
      ],
    )
    .pipe(
      Effect.mapError(() => new DependencyUnavailableError()),
      Effect.flatMap((result) => {
        if (!Array.isArray(result) || result.length !== 2) {
          return Effect.fail(new DependencyUnavailableError());
        }

        const accepted = Number(result[0]);
        const retryAfterMs = Number(result[1]);

        if (
          (accepted !== 0 && accepted !== 1) ||
          !Number.isFinite(retryAfterMs)
        ) {
          return Effect.fail(new DependencyUnavailableError());
        }

        return Effect.succeed(
          accepted === 1
            ? ({ accepted: true } as const)
            : ({
                accepted: false,
                retryAfterMs: Math.max(1, retryAfterMs),
              } as const),
        );
      }),
    );

export const consumeNotificationRateLimit = (
  redis: Pick<MessagingRedis, "eval">,
  userId: string,
) => consumeRateLimit(redis, buildNotificationRateLimitKey(userId));

export const makeMessagingDataLayer = (
  redis: MessagingRedis,
  events: MessagingEvents,
  readyRoom: MessagingReadyRoom,
) =>
  Layer.effect(
    MessagingData,
    Effect.map(ApiDatabase, (database) => {
      const operation = <A, E>(effect: Effect.Effect<A, E>) =>
        effect.pipe(
          Effect.mapError((cause) => new MessagingOperationError({ cause })),
        );

      const guildIdsFor = (discordId: string) =>
        selectAccessibleGuilds(
          database,
          discordId,
          NOTIFICATION_SEND_PERMISSIONS,
        ).pipe(Effect.map((rows) => rows.map(({ guild }) => guild.id)));

      const metadata = (notificationId: string) =>
        redis.get(`notification:${notificationId}`).pipe(
          Effect.map((value): NotificationMetadata | null => {
            if (!value) return null;

            try {
              return decodeNotificationMetadata(value);
            } catch {
              return null;
            }
          }),
        );

      return MessagingData.of({
        sendNotification: ({ userId, discordId }, data) =>
          operation(
            Effect.gen(function* () {
              const rateLimit = yield* consumeNotificationRateLimit(
                redis,
                userId,
              );

              if (rateLimit.accepted === false) {
                return yield* new RateLimitedError({
                  code: "NOTIFICATION_RATE_LIMITED",
                  retryAfterMs: rateLimit.retryAfterMs,
                });
              }

              if (!data.message && !data.npc) {
                return yield* new InvalidRequestError({
                  code: "MISSING_MESSAGE_OR_NPC",
                });
              }

              if (data.message && data.npc) {
                return yield* new InvalidRequestError({
                  code: "EITHER_MESSAGE_OR_NPC",
                });
              }

              const authorized = yield* guildIdsFor(discordId);

              if (authorized.length === 0) {
                return yield* new PermissionDeniedError();
              }

              const guildIds = authorized.filter((id) =>
                data.guildIds.includes(id),
              );

              if (guildIds.length === 0) {
                return yield* new PermissionDeniedError();
              }

              const notificationId = Bun.randomUUIDv7();

              const now = yield* Clock.currentTimeMillis;
              const createdAt = new Date(now).toISOString();

              if (data.isGatheringParty) {
                if (!data.character) {
                  return yield* new InvalidRequestError(
                    "Party gathering notifications require a character",
                  );
                }

                const [guildId] = guildIds;

                if (guildIds.length !== 1 || guildId === undefined) {
                  return yield* new InvalidRequestError({
                    code: "SINGLE_GUILD_REQUIRED",
                  });
                }

                yield* readyRoom.create({
                  notificationId,
                  organizerDiscordId: discordId,
                  organizerCharacter: data.character,
                  guildId,
                  world: data.world,
                  npc: data.npc
                    ? {
                        ...data.npc,
                        type: getNpcType(NpcType, data.npc),
                      }
                    : undefined,
                });
              }

              const metadataValue: NotificationMetadata = {
                discordId,
                userId,
                guildIds,
                createdAt,
                world: data.world,
                ...(data.npc && {
                  npcName: data.npc.name,
                  npcId: data.npc.id,
                  npc: {
                    prof: data.npc.prof,
                    type: getNpcType(NpcType, data.npc),
                    wt: data.npc.wt,
                    icon: data.npc.icon,
                    lvl: data.npc.lvl,
                    ...(data.npc.isHeroFromEvent !== undefined && {
                      isHeroFromEvent: data.npc.isHeroFromEvent,
                    }),
                  },
                }),
              };

              yield* redis.set(
                `notification:${notificationId}`,
                JSON.stringify(metadataValue),
                NOTIFICATION_TTL_SECONDS,
              );
              const { guildIds: _guildIds, heroTracker, ...rest } = data;

              const base = {
                ...rest,
                ...(heroTracker && {
                  heroTracker:
                    "entranceSecondsLeft" in heroTracker
                      ? {
                          state: heroTracker.state,
                          entranceClosesAt: new Date(
                            now + heroTracker.entranceSecondsLeft * 1000,
                          ).toISOString(),
                        }
                      : heroTracker,
                }),
                discordId,
                notificationId,
                createdAt,
              };

              const npc = data.npc;

              const payload =
                data.message || !npc
                  ? base
                  : {
                      ...base,
                      npc: {
                        ...npc,
                        type: getNpcType(NpcType, npc),
                      },
                    };

              yield* Effect.forEach(
                guildIds,
                (guildId) =>
                  events
                    .publish(RabbitRoutingKey.GUILDS_NOTIFICATIONS_SEND, {
                      ...payload,
                      guildId,
                    })
                    .pipe(ignorePublicationFailure),
                { concurrency: "unbounded", discard: true },
              );

              return { notificationId, guildIds };
            }).pipe(
              withAdapterSpan(
                "MessagingControllerSendNotification",
                "Redis/RabbitMessaging",
              ),
            ),
          ),
        volunteer: (
          discordId,
          notificationId,
          data: VolunteerForPartyRequest,
        ) =>
          operation(
            Effect.gen(function* () {
              const stored = yield* metadata(notificationId);

              if (!stored) {
                return yield* new InvalidRequestError(
                  "Notification expired or not found",
                );
              }

              if (data.targetDiscordId !== stored.discordId) {
                return yield* new PermissionDeniedError("Invalid target");
              }

              const guildIds = yield* guildIdsFor(discordId);

              if (!guildIds.some((id) => stored.guildIds.includes(id))) {
                return yield* new PermissionDeniedError(
                  "Not a member of notification guild",
                );
              }

              yield* events
                .publish(RabbitRoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER, {
                  notificationId,
                  targetDiscordId: data.targetDiscordId,
                  volunteerDiscordId: discordId,
                  world: data.world,
                  character: data.character,
                })
                .pipe(ignorePublicationFailure);
            }).pipe(
              withAdapterSpan(
                "MessagingControllerVolunteer",
                "Redis/RabbitMessaging",
              ),
            ),
          ),
        going: (
          { userId, discordId },
          notificationId,
          data: NotificationGoingRequest,
        ) =>
          operation(
            Effect.gen(function* () {
              const rateLimit = yield* consumeRateLimit(
                redis,
                buildGoingRateLimitKey(userId),
              );

              if (rateLimit.accepted === false) {
                return yield* new RateLimitedError({
                  code: "NOTIFICATION_GOING_RATE_LIMITED",
                  retryAfterMs: rateLimit.retryAfterMs,
                });
              }

              const stored = yield* metadata(notificationId);
              const npc = stored?.npc;
              const reporterUserId = stored?.userId;

              if (
                !stored ||
                !npc ||
                reporterUserId === undefined ||
                stored.world !== data.world
              ) {
                return yield* new ResourceNotFoundError({
                  code: "NOTIFICATION_NOT_FOUND",
                });
              }

              const access = yield* selectAccessibleGuildRoles(
                database,
                discordId,
                [NPC_FEATURE_PERMISSIONS.notifications.base],
              );

              const routing = isRoutableNpcSource(npc)
                ? { tier: getNpcRoutingTier(npc), npcLevel: npc.lvl }
                : null;

              const guildIds = stored.guildIds.filter((guildId) => {
                const guild = access.get(guildId);

                return (
                  guild !== undefined &&
                  routing !== null &&
                  (guild.administers ||
                    canReadNpcFeatureSource(
                      guild.roles,
                      "notifications",
                      routing,
                    ))
                );
              });

              if (guildIds.length === 0) {
                return yield* new PermissionDeniedError();
              }

              const now = yield* Clock.currentTimeMillis;

              const ttl = Math.ceil(
                (Date.parse(stored.createdAt) +
                  NOTIFICATION_TTL_SECONDS * 1000 -
                  now) /
                  1000,
              );

              if (ttl <= 0) {
                return yield* new ResourceNotFoundError({
                  code: "NOTIFICATION_NOT_FOUND",
                });
              }

              const player: NotificationGoingPlayer = {
                userId,
                characterId: data.character.characterId,
                nick: data.character.nick,
                lvl: data.character.lvl,
                prof: data.character.prof,
                icon: data.character.icon,
                ...(data.character.clan && { clan: data.character.clan }),
              };

              const guilds = yield* Effect.forEach(
                guildIds,
                (guildId) =>
                  redis
                    .eval(
                      UPDATE_GOING_SCRIPT,
                      [goingKey(notificationId, guildId)],
                      [
                        data.going ? "1" : "0",
                        userId,
                        JSON.stringify(player),
                        ttl,
                      ],
                    )
                    .pipe(
                      Effect.flatMap(decodeGoingValues),
                      Effect.map(parseGoingPlayers),
                      Effect.tap((going) =>
                        events
                          .publish(
                            RabbitRoutingKey.GUILDS_NOTIFICATIONS_GOING,
                            {
                              guildId,
                              world: data.world,
                              notificationId,
                              reporterUserId,
                              npcName: stored.npcName ?? "",
                              ...(stored.npcId !== undefined && {
                                npcId: stored.npcId,
                              }),
                              npc,
                              going,
                            },
                          )
                          .pipe(Effect.ignore),
                      ),
                      Effect.map((going) => ({ guildId, going })),
                    ),
                { concurrency: "unbounded" },
              );

              return { notificationId, guilds };
            }).pipe(
              withAdapterSpan(
                "MessagingControllerGoing",
                "Redis/RabbitMessaging",
              ),
            ),
          ),
      });
    }),
  );
