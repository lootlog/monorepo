import { and, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { getNpcRoutingTier } from "@lootlog/domain/npc-routing";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventTable,
  memberTable,
  timerHistoryEntryTable,
  timerTable,
} from "#src/database/drizzle/schema";
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import { TIMER_TYPES } from "#src/timers/constants/timer-limits";
import { ErrorKey } from "#src/timers/enum/error-key.enum";
import { TimerHistoryAction } from "#src/timers/timers.types";
import { isLegacyNpcIdIdentifier } from "#src/timers/utils/timer-key";
import {
  type TimersGuildAccess,
  TimersOperationError,
} from "./timers.handlers.js";

export interface DeleteTimerPorts {
  readonly invalidate: (pattern: string) => Effect.Effect<unknown, unknown>;
  readonly publish: (
    routingKey:
      | typeof RabbitRoutingKey.GUILDS_TIMERS_DELETE
      | typeof RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED,
    payload: unknown,
  ) => Effect.Effect<unknown, unknown>;
}

const npcField = (npc: unknown, key: string) =>
  npc && typeof npc === "object" && !Array.isArray(npc)
    ? (npc as Record<string, unknown>)[key]
    : undefined;

export const makeDeleteTimer = (
  database: typeof ApiDatabase.Service,
  ports: DeleteTimerPorts,
) => {
  const operation = Effect.fn("deleteTimerData")(function* (
    access: TimersGuildAccess,
    timerIdentifier: string,
    world: string,
  ) {
    const resolved = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const timerCondition = isLegacyNpcIdIdentifier(timerIdentifier)
          ? and(
              eq(timerTable.guildId, access.guild.id),
              eq(timerTable.world, world),
              eq(timerTable.npcId, Number.parseInt(timerIdentifier, 10)),
            )
          : and(
              eq(timerTable.guildId, access.guild.id),
              eq(timerTable.world, world),
              eq(timerTable.timerKey, timerIdentifier),
            );
        const timers = yield* transaction
          .select()
          .from(timerTable)
          .where(timerCondition);
        if (timers.length > 1) {
          return yield* Effect.fail(
            new InvalidRequestError({
              message: ErrorKey.AMBIGUOUS_TIMER_IDENTIFIER,
            }),
          );
        }
        const timer = timers[0];
        if (!timer) {
          return yield* Effect.fail(
            new ResourceNotFoundError({
              message: ErrorKey.TIMER_NOT_FOUND,
            }),
          );
        }
        const now = new Date(yield* Clock.currentTimeMillis);
        const activeEventHero = yield* transaction
          .select({ id: eventHeroNpcTable.id })
          .from(eventHeroNpcTable)
          .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
          .where(
            and(
              eq(eventTable.guildId, access.guild.id),
              eq(eventTable.world, world),
              or(
                eq(eventHeroNpcTable.npcId, timer.npcId),
                eq(
                  eventHeroNpcTable.npcName,
                  String(npcField(timer.npc, "name") ?? ""),
                ),
              ),
              or(isNull(eventTable.startsAt), lte(eventTable.startsAt, now)),
              or(isNull(eventTable.endsAt), gt(eventTable.endsAt, now)),
            ),
          )
          .limit(1);
        if (activeEventHero.length > 0) {
          return yield* Effect.fail(
            new InvalidRequestError({
              message: ErrorKey.EVENT_TIMER_MUST_USE_EVENT_CLOSE,
            }),
          );
        }
        const manual =
          Number(npcField(timer.npc, "margonemType")) ===
          TIMER_TYPES.CUSTOM_MANUAL;
        if (!manual) {
          const actors = yield* transaction
            .select({ id: memberTable.id })
            .from(memberTable)
            .where(
              and(
                eq(memberTable.userId, access.discordId),
                eq(memberTable.guildId, access.guild.id),
              ),
            )
            .limit(1);
          const actorMemberId = actors[0]?.id;
          if (actorMemberId === undefined) {
            return yield* Effect.fail(
              new Error("Timer history actor member was not found"),
            );
          }
          yield* transaction.insert(timerHistoryEntryTable).values({
            guildId: access.guild.id,
            world,
            timerKey: timer.timerKey,
            npcId: timer.npcId,
            npc: timer.npc,
            action: TimerHistoryAction.DELETE,
            actorMemberId,
            minSpawnTime: timer.minSpawnTime,
            maxSpawnTime: timer.maxSpawnTime,
            latestRespBaseSeconds: timer.latestRespBaseSeconds,
            latestRespawnRandomness: timer.latestRespawnRandomness,
            wasReset: timer.wasReset,
            windowOpenedAt: timer.windowOpenedAt,
            timerCreatedById: timer.createdById,
            timerActorCharacterSnapshotId: timer.actorCharacterSnapshotId,
            timerActorCharacterLvl: timer.actorCharacterLvl,
          });
          const staleHistory = yield* transaction
            .select({ id: timerHistoryEntryTable.id })
            .from(timerHistoryEntryTable)
            .where(
              and(
                eq(timerHistoryEntryTable.guildId, access.guild.id),
                eq(timerHistoryEntryTable.world, world),
                eq(timerHistoryEntryTable.timerKey, timer.timerKey),
              ),
            )
            .orderBy(
              desc(timerHistoryEntryTable.createdAt),
              desc(timerHistoryEntryTable.id),
            )
            .offset(5);
          if (staleHistory.length > 0) {
            yield* transaction.delete(timerHistoryEntryTable).where(
              inArray(
                timerHistoryEntryTable.id,
                staleHistory.map(({ id }) => id),
              ),
            );
          }
          const updated = yield* transaction
            .update(timerTable)
            .set({ deletedAt: now, updatedAt: now })
            .where(timerCondition)
            .returning();
          if (!updated[0]) {
            return yield* Effect.fail(
              new ResourceNotFoundError({
                message: ErrorKey.TIMER_NOT_FOUND,
              }),
            );
          }
        } else {
          const deleted = yield* transaction
            .delete(timerTable)
            .where(timerCondition)
            .returning();
          if (!deleted[0]) {
            return yield* Effect.fail(
              new ResourceNotFoundError({
                message: ErrorKey.TIMER_NOT_FOUND,
              }),
            );
          }
        }
        return timer;
      }),
    );
    const npcLevel = npcField(resolved.npc, "lvl");
    const payload = {
      npcId: resolved.npcId,
      timerKey: resolved.timerKey,
      world,
      guildId: access.guild.id,
      routing: {
        tier: getNpcRoutingTier(
          resolved.npc as {
            readonly lvl?: number;
            readonly prof?: string;
            readonly type?: number | string;
            readonly wt?: number | string;
          },
        ),
        npcLevel: typeof npcLevel === "number" ? npcLevel : undefined,
      },
    };
    yield* ports.invalidate(`timer:list:${access.guild.id}:*`);
    yield* ports.publish(RabbitRoutingKey.GUILDS_TIMERS_DELETE, payload);
    yield* ports.publish(RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED, payload);
  });
  return (
    access: TimersGuildAccess,
    timerIdentifier: string,
    world?: string,
  ) =>
    world
      ? operation(access, timerIdentifier, world).pipe(
          Effect.mapError((cause) => new TimersOperationError({ cause })),
        )
      : Effect.fail(
          new TimersOperationError({
            cause: new ResourceNotFoundError({
              message: ErrorKey.TIMER_NOT_FOUND,
            }),
          }),
        );
};
