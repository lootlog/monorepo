import { randomUUID } from "node:crypto";
import { v4 as uuid } from "uuid";
import { and, arrayOverlaps, eq, isNotNull, or } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { getNpcTypeByWt } from "@lootlog/domain/npc-type";
import {
  RabbitRoutingKey,
  type RabbitRoutingKeyName,
} from "@lootlog/protocol/rabbit/topology";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from "#src/shared/http/http-errors";
import {
  MessagingData,
  MessagingOperationError,
} from "./messaging.handlers.js";
import type {
  CreateNotificationDto,
  CreateVolunteerDto,
} from "../../lootlog-api.js";

const NOTIFICATION_TTL_SECONDS = 1800;
export const NOTIFICATION_RATE_LIMIT_WINDOW_MS = 5_000;
export const NOTIFICATION_RATE_LIMIT_MAX_ATTEMPTS = 5;
export const buildNotificationRateLimitKey = (userId: string) =>
  `messaging:notification-rate:${userId}`;
const RATE_LIMIT_SCRIPT = `
local time = redis.call("TIME")
local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", now - window)
local count = redis.call("ZCARD", KEYS[1])
if count >= limit then
  local oldest = redis.call("ZRANGE", KEYS[1], 0, 0, "WITHSCORES")
  local retryAfter = math.max(1, tonumber(oldest[2]) + window - now)
  return {0, retryAfter}
end
redis.call("ZADD", KEYS[1], now, ARGV[3])
redis.call("PEXPIRE", KEYS[1], window)
return {1, 0}
`;

type NotificationMetadata = {
  readonly discordId: string;
  readonly guildIds: ReadonlyArray<string>;
  readonly createdAt: string;
};

export interface MessagingRedis {
  readonly get: (key: string) => Effect.Effect<string | null, unknown>;
  readonly set: (
    key: string,
    value: string,
    ttl: number,
  ) => Effect.Effect<unknown, unknown>;
  readonly eval: <A>(
    script: string,
    keys: ReadonlyArray<string>,
    arguments_: ReadonlyArray<string | number>,
  ) => Effect.Effect<A, unknown>;
}

export interface MessagingEvents {
  readonly publish: (
    routingKey: RabbitRoutingKeyName,
    payload: unknown,
  ) => Effect.Effect<void, unknown>;
}

export interface MessagingReadyRoom {
  readonly create: (input: {
    readonly notificationId: string;
    readonly organizerDiscordId: string;
    readonly organizerCharacter: NonNullable<
      CreateNotificationDto["character"]
    >;
    readonly guildIds: ReadonlyArray<string>;
    readonly world: string;
  }) => Effect.Effect<unknown, unknown>;
}

export type NotificationRateLimitOutcome =
  | { readonly accepted: true }
  | { readonly accepted: false; readonly retryAfterMs: number };

export const consumeNotificationRateLimit = (
  redis: Pick<MessagingRedis, "eval">,
  userId: string,
): Effect.Effect<NotificationRateLimitOutcome, ServiceUnavailableException> =>
  redis
    .eval<unknown>(
      RATE_LIMIT_SCRIPT,
      [buildNotificationRateLimitKey(userId)],
      [
        NOTIFICATION_RATE_LIMIT_WINDOW_MS,
        NOTIFICATION_RATE_LIMIT_MAX_ATTEMPTS,
        randomUUID(),
      ],
    )
    .pipe(
      Effect.mapError(() => new ServiceUnavailableException()),
      Effect.flatMap((result) => {
        if (!Array.isArray(result) || result.length !== 2) {
          return Effect.fail(new ServiceUnavailableException());
        }
        const accepted = Number(result[0]);
        const retryAfterMs = Number(result[1]);
        if (
          (accepted !== 0 && accepted !== 1) ||
          !Number.isFinite(retryAfterMs)
        ) {
          return Effect.fail(new ServiceUnavailableException());
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

const permissionSet = [
  Permission.LOOTLOG_NOTIFICATIONS_SEND,
  Permission.OWNER,
  Permission.ADMIN,
  Permission.LOOTLOG_MANAGE,
] as const;

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
        database
          .selectDistinct({ id: guildTable.id })
          .from(guildTable)
          .leftJoin(
            memberTable,
            and(
              eq(memberTable.guildId, guildTable.id),
              eq(memberTable.userId, discordId),
              eq(memberTable.active, true),
              isNotNull(memberTable.globalUserId),
            ),
          )
          .leftJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
          .leftJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
          .where(
            and(
              eq(guildTable.active, true),
              or(
                eq(guildTable.ownerId, discordId),
                arrayOverlaps(roleTable.permissions, [...permissionSet]),
              ),
            ),
          )
          .pipe(Effect.map((guilds) => guilds.map(({ id }) => id)));
      const metadata = (notificationId: string) =>
        redis.get(`notification:${notificationId}`).pipe(
          Effect.map((value): NotificationMetadata | null => {
            if (!value) return null;
            try {
              return JSON.parse(value) as NotificationMetadata;
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
                return yield* Effect.fail(
                  new HttpException(
                    {
                      message: "NOTIFICATION_RATE_LIMITED",
                      retryAfterMs: rateLimit.retryAfterMs,
                    },
                    HttpStatus.TOO_MANY_REQUESTS,
                  ),
                );
              }
              if (!data.message && !data.npc) {
                return yield* Effect.fail(
                  new BadRequestException("MISSING_MESSAGE_OR_NPC"),
                );
              }
              if (data.message && data.npc) {
                return yield* Effect.fail(
                  new BadRequestException("EITHER_MESSAGE_OR_NPC"),
                );
              }
              const authorized = yield* guildIdsFor(discordId);
              if (authorized.length === 0) {
                return yield* Effect.fail(new ForbiddenException());
              }
              const guildIds = authorized.filter((id) =>
                data.guildIds.includes(id),
              );
              if (guildIds.length === 0) {
                return yield* Effect.fail(new ForbiddenException());
              }
              const notificationId = uuid();
              const createdAt = new Date().toISOString();
              if (data.isGatheringParty) {
                if (!data.character) {
                  return yield* Effect.fail(
                    new BadRequestException(
                      "Party gathering notifications require a character",
                    ),
                  );
                }
                yield* readyRoom.create({
                  notificationId,
                  organizerDiscordId: discordId,
                  organizerCharacter: data.character,
                  guildIds,
                  world: data.world,
                });
              }
              yield* redis.set(
                `notification:${notificationId}`,
                JSON.stringify({ discordId, guildIds, createdAt }),
                NOTIFICATION_TTL_SECONDS,
              );
              const { guildIds: _guildIds, ...rest } = data;
              const base = { ...rest, discordId, notificationId, createdAt };
              const npc = data.npc;
              const payload =
                data.message || !npc
                  ? base
                  : {
                      ...base,
                      npc: {
                        ...npc,
                        type: getNpcTypeByWt(
                          NpcType,
                          npc.wt,
                          npc.prof,
                          npc.type,
                        ),
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
                    .pipe(Effect.ignore),
                { discard: true },
              );
              return { notificationId, guildIds };
            }).pipe(
              Effect.withSpan("MessagingControllerSendNotification", {
                attributes: { adapter: "Redis/RabbitMessaging", retryCount: 0 },
              }),
            ),
          ),
        volunteer: (discordId, notificationId, data: CreateVolunteerDto) =>
          operation(
            Effect.gen(function* () {
              const stored = yield* metadata(notificationId);
              if (!stored) {
                return yield* Effect.fail(
                  new BadRequestException("Notification expired or not found"),
                );
              }
              if (data.targetDiscordId !== stored.discordId) {
                return yield* Effect.fail(
                  new ForbiddenException("Invalid target"),
                );
              }
              const guildIds = yield* guildIdsFor(discordId);
              if (!guildIds.some((id) => stored.guildIds.includes(id))) {
                return yield* Effect.fail(
                  new ForbiddenException("Not a member of notification guild"),
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
                .pipe(Effect.ignore);
            }).pipe(
              Effect.withSpan("MessagingControllerVolunteer", {
                attributes: { adapter: "Redis/RabbitMessaging", retryCount: 0 },
              }),
            ),
          ),
      });
    }),
  );
