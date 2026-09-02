import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { Effect, Schema } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  memberTable,
  playerSnapshotTable,
  timerTable,
} from "#src/database/drizzle/schema";
import type { Timer } from "#src/timers/timers.types";

type TimerWrite = Omit<
  typeof timerTable.$inferInsert,
  "createdAt" | "updatedAt"
>;
type TimerPatch = Partial<Omit<TimerWrite, "guildId" | "world" | "timerKey">>;

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class EventTimerStoreFailure extends Schema.TaggedError<EventTimerStoreFailure>()(
  "EventTimerStoreFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

const identity = (guildId: string, world: string, timerKey: string) =>
  and(
    eq(timerTable.guildId, guildId),
    eq(timerTable.world, world),
    eq(timerTable.timerKey, timerKey),
  );

export const makeEventTimerStore = (database: ApiDatabaseValue) => {
  const operation = <A>(name: string, effect: Effect.Effect<A, unknown>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new EventTimerStoreFailure({ operation: name, cause }),
      ),
      Effect.withSpan(name, {
        attributes: { adapter: "api.database", retryCount: 0 },
      }),
    );

  const findTimer = (guildId: string, world: string, timerKey: string) =>
    operation(
      "eventTimerStore.find",
      database
        .select({
          timer: timerTable,
          member: memberTable,
          actorCharacter: playerSnapshotTable,
        })
        .from(timerTable)
        .leftJoin(memberTable, eq(memberTable.id, timerTable.createdById))
        .leftJoin(
          playerSnapshotTable,
          eq(playerSnapshotTable.id, timerTable.actorCharacterSnapshotId),
        )
        .where(identity(guildId, world, timerKey))
        .pipe(
          Effect.map((rows) => {
            const row = rows[0];
            return row
              ? {
                  ...row.timer,
                  member: row.member,
                  actorCharacter: row.actorCharacter,
                }
              : null;
          }),
        ),
    );

  const upsertTimer = (create: TimerWrite, update: TimerPatch) => {
    const now = new Date();
    return operation(
      "eventTimerStore.upsert",
      database
        .insert(timerTable)
        .values({ ...create, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: [timerTable.guildId, timerTable.world, timerTable.timerKey],
          set: { ...update, updatedAt: now },
        })
        .returning(),
    ).pipe(
      Effect.flatMap((rows) => {
        const row = rows[0];
        return row
          ? findTimer(row.guildId, row.world, row.timerKey).pipe(
              Effect.map((timer) => timer ?? row),
            )
          : Effect.fail(
              new EventTimerStoreFailure({
                operation: "eventTimerStore.upsert.returning",
                cause: "Timer mutation returned no row",
              }),
            );
      }),
    );
  };

  const deleteTimer = (guildId: string, world: string, timerKey: string) =>
    operation(
      "eventTimerStore.delete",
      database
        .delete(timerTable)
        .where(identity(guildId, world, timerKey))
        .returning()
        .pipe(Effect.map((rows) => rows[0] ?? null)),
    );

  const findActiveTimerKeys = (
    lookups: ReadonlyArray<{
      readonly guildId: string;
      readonly world: string;
      readonly timerKey: string;
    }>,
  ) =>
    lookups.length === 0
      ? Effect.succeed([])
      : operation(
          "eventTimerStore.findActiveKeys",
          database
            .select({
              guildId: timerTable.guildId,
              world: timerTable.world,
              timerKey: timerTable.timerKey,
            })
            .from(timerTable)
            .where(
              or(
                ...lookups.map((lookup) =>
                  identity(lookup.guildId, lookup.world, lookup.timerKey),
                ),
              ),
            ),
        );

  const heroProjection = {
    npcId: timerTable.npcId,
    timerKey: timerTable.timerKey,
    world: timerTable.world,
    minSpawnTime: timerTable.minSpawnTime,
    maxSpawnTime: timerTable.maxSpawnTime,
    npc: timerTable.npc,
  };
  const findEventHeroTimersByKeys = (
    guildId: string,
    world: string,
    timerKeys: string[],
  ) =>
    operation(
      "eventTimerStore.findHeroByKeys",
      database
        .select(heroProjection)
        .from(timerTable)
        .where(
          and(
            eq(timerTable.guildId, guildId),
            eq(timerTable.world, world),
            inArray(timerTable.timerKey, timerKeys),
          ),
        ),
    ).pipe(Effect.map((timers) => timers as Timer[]));
  const findEventHeroTimersByNames = (
    guildId: string,
    world: string,
    npcNames: string[],
  ) =>
    operation(
      "eventTimerStore.findHeroByNames",
      database
        .select(heroProjection)
        .from(timerTable)
        .where(
          and(
            eq(timerTable.guildId, guildId),
            eq(timerTable.world, world),
            sql`${timerTable.npc}->>'name' = ANY(${npcNames}::text[])`,
          ),
        )
        .orderBy(desc(timerTable.maxSpawnTime)),
    ).pipe(Effect.map((timers) => timers as Timer[]));

  return {
    findTimer,
    upsertTimer,
    deleteTimer,
    findActiveTimerKeys,
    findEventHeroTimersByKeys,
    findEventHeroTimersByNames,
  };
};

export type EventTimerStore = ReturnType<typeof makeEventTimerStore>;
