import { activeEventCondition } from "#src/events/event-scope-query";
import { getTimerHistoryValues } from "./timer-restore-snapshot.js";
import { pruneTimerHistory } from "./timer-history-retention.js";
import { findActiveGuildMember } from "#src/members/member-access-query";
import { upsertActorCharacter } from "./timer-actor-snapshot.js";
import { and, eq, gte } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { DEFAULT_RESPAWN_RANDOMNESS } from "@lootlog/domain/timers";
import { normalizeNpcIcon } from "@lootlog/domain/npc-icon";
import { getNpcTypeRoutingTier } from "@lootlog/schema/npc-routing";
import { closeKilledHeroSighting } from "#src/hero-sightings/hero-sightings.data-layer";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventTable,
} from "#src/database/drizzle/event.schema";
import {
  timerHistoryEntryTable,
  timerTable,
} from "#src/database/drizzle/timer.schema";
import { eventHeroCheckOutboxTable } from "#src/database/drizzle/event-hero-check-outbox.schema";
import {
  buildEventHeroKillJobId,
  createEventHeroKillJobData,
  getEventHeroKillWindowKey,
} from "#src/events/kills/event-hero-kill-job";
import { InvalidRequestError } from "@lootlog/protocol/http/errors";
import { ErrorKey } from "#src/timers/error-key";
import { TimerHistoryAction } from "#src/timers/timers.types";
import { buildTimerKey, buildTimerLockKey } from "#src/timers/timer-key";
import { getEventHeroSyntheticNpcId } from "@lootlog/domain/npc-identity";
import type { CreateAutoTimerRequest } from "#src/contracts/timers/schemas";
import type { TimersIdentity } from "./timers-data.js";
import {
  TimersInvariantViolation,
  TimersMemberNotFound,
} from "./timer-errors.js";
import { timerNpcTemplateId } from "#src/timers/timer-projection";
import {
  calculateSpawnWindow,
  findSameEntranceTimer,
  getReportedEntranceClosesAt,
  makeNpc,
  getEntranceRespBaseSeconds,
} from "./timer-auto-report.js";

export const DEDUP_TTL_SECONDS = 30;

export interface AutoTimerPersistencePorts {
  readonly withLock: <A, E>(
    key: string,
    effect: Effect.Effect<A, E>,
  ) => Effect.Effect<A, E | unknown>;
}

const migrateSyntheticTimer = (
  database: Pick<typeof ApiDatabase.Service, "delete" | "select">,
  options: {
    readonly guildId: string;
    readonly world: string;
    readonly npcId: number;
    readonly npcName: string;
  },
) =>
  Effect.gen(function* () {
    const now = new Date(yield* Clock.currentTimeMillis);

    const heroes = yield* database
      .select({ hero: eventHeroNpcTable })
      .from(eventHeroNpcTable)
      .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
      .where(
        and(
          eq(eventTable.guildId, options.guildId),
          eq(eventTable.world, options.world),
          eq(eventHeroNpcTable.npcName, options.npcName),
          activeEventCondition(now),
        ),
      )
      .limit(1);

    const hero = heroes[0]?.hero;

    if (hero?.npcId !== null) return null;
    const syntheticNpcId = getEventHeroSyntheticNpcId(hero.id);

    if (syntheticNpcId === options.npcId) return null;
    const syntheticTimerKey = buildTimerKey(syntheticNpcId, options.npcName);

    const syntheticRows = yield* database
      .select()
      .from(timerTable)
      .where(
        and(
          eq(timerTable.guildId, options.guildId),
          eq(timerTable.world, options.world),
          eq(timerTable.timerKey, syntheticTimerKey),
        ),
      )
      .limit(1);

    const timer = syntheticRows[0];

    if (!timer) return null;
    yield* database
      .delete(timerTable)
      .where(
        and(
          eq(timerTable.guildId, options.guildId),
          eq(timerTable.world, options.world),
          eq(timerTable.timerKey, syntheticTimerKey),
        ),
      );

    return { timer, syntheticNpcId, syntheticTimerKey };
  });

type TimerRow = typeof timerTable.$inferSelect;

const insertEventHeroCheck = (
  transaction: Pick<typeof ApiDatabase.Service, "insert">,
  {
    guildId,
    payload,
    timer,
    previousTimer,
  }: {
    readonly guildId: string;
    readonly payload: CreateAutoTimerRequest;
    readonly timer: TimerRow;
    readonly previousTimer: TimerRow | null;
  },
) => {
  const check = {
    guildId,
    world: payload.world,
    npcId: payload.npc.id,
    npcName: payload.npc.name,
    npcIcon: normalizeNpcIcon(payload.npc.icon),
    npcLvl: payload.npc.lvl,
    timerData: {
      minSpawnTime: timer.minSpawnTime,
      maxSpawnTime: timer.maxSpawnTime,
      memberId: timer.createdById,
      previousMinSpawnTime: previousTimer?.minSpawnTime ?? null,
      previousMaxSpawnTime: previousTimer?.maxSpawnTime ?? null,
      windowOpenedAt: previousTimer?.windowOpenedAt ?? null,
    },
  };

  return transaction.insert(eventHeroCheckOutboxTable).values({
    guildId,
    jobId: buildEventHeroKillJobId({
      guildId,
      world: payload.world,
      npcId: payload.npc.id,
      windowKey: getEventHeroKillWindowKey(check.timerData),
      isManualClose: false,
    }),
    payload: createEventHeroKillJobData(check, false),
  });
};

const findRecentlyCreatedTimer = Effect.fnUntraced(function* (
  database: Pick<typeof ApiDatabase.Service, "select">,
  timer: typeof timerTable.$inferSelect | null,
  startedAt: Date,
) {
  if (!timer) return null;

  const dedupSince = new Date(startedAt.getTime() - DEDUP_TTL_SECONDS * 1000);

  const recentCreates = yield* database
    .select({ id: timerHistoryEntryTable.id })
    .from(timerHistoryEntryTable)
    .where(
      and(
        eq(timerHistoryEntryTable.guildId, timer.guildId),
        eq(timerHistoryEntryTable.world, timer.world),
        eq(timerHistoryEntryTable.timerKey, timer.timerKey),
        eq(timerHistoryEntryTable.action, TimerHistoryAction.CREATE),
        gte(timerHistoryEntryTable.createdAt, dedupSince),
      ),
    )
    .limit(1);

  return recentCreates.length > 0 ? timer : null;
});

export const persistAutoTimer = (
  database: typeof ApiDatabase.Service,
  ports: AutoTimerPersistencePorts,
  identity: TimersIdentity,
  payload: CreateAutoTimerRequest,
  {
    guildId,
    timerNpcId,
    timerKey,
  }: {
    readonly guildId: string;
    readonly timerNpcId: number;
    readonly timerKey: string;
  },
) =>
  ports.withLock(
    buildTimerLockKey(guildId, payload.world, timerKey),
    database.transaction((transaction) =>
      Effect.gen(function* () {
        const startedAt = new Date(yield* Clock.currentTimeMillis);

        const member = yield* findActiveGuildMember(
          transaction,
          identity.discordId,
          guildId,
        );

        if (!member)
          return yield* Effect.die(
            new TimersMemberNotFound({
              guildId,
              discordId: identity.discordId,
            }),
          );

        const existingRows = yield* transaction
          .select()
          .from(timerTable)
          .where(
            and(
              eq(timerTable.guildId, guildId),
              eq(timerTable.world, payload.world),
              eq(timerTable.timerKey, timerKey),
            ),
          )
          .limit(1);

        let previousTimer = existingRows[0] ?? null;

        const entranceClosesAt = getReportedEntranceClosesAt(
          payload,
          startedAt,
        );

        const respBaseSeconds = entranceClosesAt
          ? getEntranceRespBaseSeconds(payload, previousTimer)
          : payload.respBaseSeconds;

        const window = yield* Effect.try({
          try: () => calculateSpawnWindow(payload, startedAt, respBaseSeconds),
          catch: (cause) =>
            cause instanceof InvalidRequestError
              ? cause
              : new InvalidRequestError({
                  code: ErrorKey.INVALID_CUSTOM_SPAWN_TIME,
                }),
        });

        const completedTimer = yield* findRecentlyCreatedTimer(
          transaction,
          previousTimer,
          startedAt,
        );

        if (completedTimer) {
          return { _tag: "Unpublished" as const, projection: completedTimer };
        }

        const sameEntrance = findSameEntranceTimer(
          previousTimer,
          entranceClosesAt,
        );

        if (sameEntrance) {
          return { _tag: "Duplicate" as const, projection: sameEntrance };
        }

        const actorCharacter = yield* upsertActorCharacter(
          transaction,
          payload.world,
          payload.actorCharacter,
        );

        let migratedSyntheticNpcId: number | null = null;
        let migratedSyntheticTimerKey: string | null = null;

        if (!previousTimer) {
          const migrated = yield* migrateSyntheticTimer(transaction, {
            guildId,
            world: payload.world,
            npcId: timerNpcId,
            npcName: payload.npc.name,
          });

          if (migrated) {
            previousTimer = migrated.timer;
            migratedSyntheticNpcId = migrated.syntheticNpcId;
            migratedSyntheticTimerKey = migrated.syntheticTimerKey;
          }
        }

        const now = new Date(yield* Clock.currentTimeMillis);
        const npc = makeNpc(payload, timerNpcTemplateId(previousTimer?.npc));

        const timerUpdate = {
          createdById: member.id,
          ...window,
          latestRespBaseSeconds: respBaseSeconds,
          latestRespawnRandomness:
            payload.respawnRandomness ?? DEFAULT_RESPAWN_RANDOMNESS,
          wasReset: false,
          npc,
          windowOpenedAt: now,
          entranceClosesAt,
          actorCharacterSnapshotId: actorCharacter?.id ?? null,
          actorCharacterLvl: payload.actorCharacter?.lvl ?? null,
          deletedAt: null,
          updatedAt: now,
        };

        const timerRows = yield* transaction
          .insert(timerTable)
          .values({
            ...timerUpdate,
            guildId,
            world: payload.world,
            npcId: timerNpcId,
            timerKey,
            createdAt: now,
          })
          .onConflictDoUpdate({
            target: [timerTable.guildId, timerTable.world, timerTable.timerKey],
            set: timerUpdate,
          })
          .returning();

        const timer = timerRows[0];

        if (!timer)
          return yield* Effect.die(
            new TimersInvariantViolation({ code: "AUTO_UPSERT_NO_ROW" }),
          );
        yield* transaction.insert(timerHistoryEntryTable).values({
          ...getTimerHistoryValues(timer),
          guildId,
          world: payload.world,
          timerKey,
          npcId: timerNpcId,
          npc,
          action: TimerHistoryAction.CREATE,
          actorMemberId: member.id,
          actorCharacterSnapshotId: actorCharacter?.id,
          actorCharacterLvl: payload.actorCharacter?.lvl,
          minSpawnTime: window.minSpawnTime,
          maxSpawnTime: window.maxSpawnTime,
        });

        yield* pruneTimerHistory(transaction, guildId, payload.world, timerKey);

        yield* insertEventHeroCheck(transaction, {
          guildId,
          payload,
          timer,
          previousTimer,
        });

        const closedHeroSightingId =
          getNpcTypeRoutingTier(npc.type) === "heroes"
            ? yield* closeKilledHeroSighting(transaction, {
                guildId,
                world: payload.world,
                heroName: payload.npc.name,
                killedAt: now,
              })
            : null;

        return {
          _tag: "Created" as const,
          projection: { ...timer, member, actorCharacter },
          previousTimer,
          migratedSyntheticNpcId,
          migratedSyntheticTimerKey,
          closedHeroSightingId,
        };
      }),
    ),
  );
