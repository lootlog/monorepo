import { and, desc, eq, inArray } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  memberTable,
  playerSnapshotTable,
  timerHistoryEntryTable,
  timerTable,
} from "#src/database/drizzle/schema";
import {
  InvalidRequestError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import { ErrorKey } from "#src/timers/enum/error-key.enum";
import { TimerHistoryAction } from "#src/timers/timers.types";
import {
  type TimersGuildAccess,
  TimersOperationError,
} from "./timers.handlers.js";
import { mapTimerResponse } from "./timer-response.js";

export interface RestoreTimerPorts {
  readonly invalidate: (pattern: string) => Effect.Effect<unknown, unknown>;
  readonly publish: (
    routingKey:
      | typeof RabbitRoutingKey.GUILDS_TIMERS_UPDATE
      | typeof RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
    payload: unknown,
  ) => Effect.Effect<unknown, unknown>;
}

export const makeRestoreTimer = (
  database: typeof ApiDatabase.Service,
  ports: RestoreTimerPorts,
) => {
  const operation = Effect.fn("restoreTimerData")(function* (
    access: TimersGuildAccess,
    historyEntryId: number,
  ) {
    const projection = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const historyRows = yield* transaction
          .select()
          .from(timerHistoryEntryTable)
          .where(
            and(
              eq(timerHistoryEntryTable.id, historyEntryId),
              eq(timerHistoryEntryTable.guildId, access.guild.id),
            ),
          )
          .limit(1);
        const entry = historyRows[0];
        if (!entry) {
          return yield* Effect.fail(
            new ResourceNotFoundError({
              message: ErrorKey.TIMER_HISTORY_ENTRY_NOT_FOUND,
            }),
          );
        }
        if (
          entry.action !== TimerHistoryAction.DELETE ||
          entry.timerCreatedById === null ||
          entry.minSpawnTime === null ||
          entry.maxSpawnTime === null ||
          entry.latestRespBaseSeconds === null ||
          entry.latestRespawnRandomness === null
        ) {
          return yield* Effect.fail(
            new InvalidRequestError({
              message: ErrorKey.TIMER_HISTORY_ENTRY_CANNOT_BE_RESTORED,
            }),
          );
        }
        const existingRows = yield* transaction
          .select()
          .from(timerTable)
          .where(
            and(
              eq(timerTable.guildId, access.guild.id),
              eq(timerTable.world, entry.world),
              eq(timerTable.timerKey, entry.timerKey),
            ),
          )
          .limit(1);
        if (existingRows[0]?.deletedAt === null) {
          return yield* Effect.fail(
            new ResourceConflictError({ message: ErrorKey.EXISTING_TIMER }),
          );
        }
        const now = new Date(yield* Clock.currentTimeMillis);
        const restoredRows = yield* transaction
          .insert(timerTable)
          .values({
            createdById: entry.timerCreatedById,
            guildId: access.guild.id,
            npcId: entry.npcId,
            timerKey: entry.timerKey,
            world: entry.world,
            minSpawnTime: entry.minSpawnTime,
            maxSpawnTime: entry.maxSpawnTime,
            latestRespBaseSeconds: entry.latestRespBaseSeconds,
            latestRespawnRandomness: entry.latestRespawnRandomness,
            wasReset: entry.wasReset ?? false,
            npc: entry.npc,
            windowOpenedAt: entry.windowOpenedAt,
            actorCharacterSnapshotId: entry.timerActorCharacterSnapshotId,
            actorCharacterLvl: entry.timerActorCharacterLvl,
            deletedAt: null,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [timerTable.guildId, timerTable.world, timerTable.timerKey],
            set: {
              createdById: entry.timerCreatedById,
              npcId: entry.npcId,
              minSpawnTime: entry.minSpawnTime,
              maxSpawnTime: entry.maxSpawnTime,
              latestRespBaseSeconds: entry.latestRespBaseSeconds,
              latestRespawnRandomness: entry.latestRespawnRandomness,
              wasReset: entry.wasReset ?? false,
              npc: entry.npc,
              windowOpenedAt: entry.windowOpenedAt,
              actorCharacterSnapshotId: entry.timerActorCharacterSnapshotId,
              actorCharacterLvl: entry.timerActorCharacterLvl,
              deletedAt: null,
              updatedAt: now,
            },
          })
          .returning();
        const restored = restoredRows[0];
        if (!restored)
          return yield* Effect.fail(new Error("Timer restore returned no row"));
        const actors = yield* transaction
          .select()
          .from(memberTable)
          .where(
            and(
              eq(memberTable.userId, access.discordId),
              eq(memberTable.guildId, access.guild.id),
            ),
          )
          .limit(1);
        const actor = actors[0];
        if (!actor)
          return yield* Effect.fail(
            new Error("Timer history actor member was not found"),
          );
        yield* transaction.insert(timerHistoryEntryTable).values({
          guildId: access.guild.id,
          world: entry.world,
          timerKey: entry.timerKey,
          npcId: entry.npcId,
          npc: entry.npc,
          action: TimerHistoryAction.RESTORE,
          actorMemberId: actor.id,
          minSpawnTime: entry.minSpawnTime,
          maxSpawnTime: entry.maxSpawnTime,
          latestRespBaseSeconds: restored.latestRespBaseSeconds,
          latestRespawnRandomness: restored.latestRespawnRandomness,
          wasReset: restored.wasReset,
          windowOpenedAt: restored.windowOpenedAt,
          timerCreatedById: restored.createdById,
          timerActorCharacterSnapshotId: restored.actorCharacterSnapshotId,
          timerActorCharacterLvl: restored.actorCharacterLvl,
        });
        const staleHistory = yield* transaction
          .select({ id: timerHistoryEntryTable.id })
          .from(timerHistoryEntryTable)
          .where(
            and(
              eq(timerHistoryEntryTable.guildId, access.guild.id),
              eq(timerHistoryEntryTable.world, entry.world),
              eq(timerHistoryEntryTable.timerKey, entry.timerKey),
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
        const creators = yield* transaction
          .select()
          .from(memberTable)
          .where(eq(memberTable.id, restored.createdById))
          .limit(1);
        const characters = restored.actorCharacterSnapshotId
          ? yield* transaction
              .select()
              .from(playerSnapshotTable)
              .where(
                eq(playerSnapshotTable.id, restored.actorCharacterSnapshotId),
              )
              .limit(1)
          : [];
        return {
          ...restored,
          member: creators[0] ?? null,
          actorCharacter: characters[0] ?? null,
        };
      }),
    );
    const response = mapTimerResponse(projection);
    yield* ports.invalidate(`timer:list:${access.guild.id}:*`);
    yield* ports.publish(RabbitRoutingKey.GUILDS_TIMERS_UPDATE, response);
    yield* ports.publish(
      RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
      response,
    );
    return response;
  });
  return (access: TimersGuildAccess, historyEntryId: number) =>
    operation(access, historyEntryId).pipe(
      Effect.mapError((cause) => new TimersOperationError({ cause })),
    );
};
