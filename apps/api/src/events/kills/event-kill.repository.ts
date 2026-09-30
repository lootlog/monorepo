import { randomUUID } from "node:crypto";

import { and, asc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  eventHeroKillTable,
  eventHeroNpcTable,
  eventKillPointTable,
  eventMapAssignmentHistoryTable,
  eventMapTable,
  eventMapToMemberTable,
} from "#src/database/drizzle/schema";

type Database = ApiDatabaseValue;

type KillPointInsert = Omit<typeof eventKillPointTable.$inferInsert, "id">;

export const makeEventKillStore = (database: ApiDatabaseValue) => {
  function run<A>(
    operation: (database: Database) => Effect.Effect<A, unknown>,
  ) {
    return operation(database);
  }

  function updateHero(
    id: string,
    data: Partial<typeof eventHeroNpcTable.$inferInsert>,
  ) {
    return run((database) =>
      database
        .update(eventHeroNpcTable)
        .set(data)
        .where(eq(eventHeroNpcTable.id, id))
        .returning(),
    ).pipe(Effect.map((rows) => rows[0]));
  }

  function findMaps(heroNpcId: string) {
    return run((database) =>
      database
        .select()
        .from(eventMapTable)
        .where(eq(eventMapTable.heroNpcId, heroNpcId)),
    );
  }

  function recordKill(
    params: {
      heroNpcId: string;
      killedAt: Date;
      minSpawnTimeAtKill: Date;
      maxSpawnTimeAtKill: Date;
      timerCreatedById?: number | null;
      isManualClose: boolean;
      mapIds: string[];
      assignmentOverlapStart: Date;
    },
    buildPoints: (
      assignments: Array<typeof eventMapAssignmentHistoryTable.$inferSelect>,
      killId: string,
    ) => Effect.Effect<KillPointInsert[], unknown>,
  ) {
    return run((database) =>
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const killId = randomUUID();

          const killRows = yield* transaction
            .insert(eventHeroKillTable)
            .values({
              id: killId,
              heroNpcId: params.heroNpcId,
              killedAt: params.killedAt,
              minSpawnTimeAtKill: params.minSpawnTimeAtKill,
              maxSpawnTimeAtKill: params.maxSpawnTimeAtKill,
              timerCreatedById: params.timerCreatedById ?? null,
              isManualClose: params.isManualClose,
            })
            .returning();

          const assignments =
            params.mapIds.length === 0
              ? []
              : yield* transaction
                  .select()
                  .from(eventMapAssignmentHistoryTable)
                  .where(
                    and(
                      inArray(
                        eventMapAssignmentHistoryTable.mapId,
                        params.mapIds,
                      ),
                      lte(
                        eventMapAssignmentHistoryTable.assignedAt,
                        params.killedAt,
                      ),
                      or(
                        isNull(eventMapAssignmentHistoryTable.unassignedAt),
                        gte(
                          eventMapAssignmentHistoryTable.unassignedAt,
                          params.assignmentOverlapStart,
                        ),
                      ),
                    ),
                  )
                  .orderBy(asc(eventMapAssignmentHistoryTable.assignedAt));

          const points = yield* buildPoints(assignments, killId);

          if (points.length > 0)
            yield* transaction
              .insert(eventKillPointTable)
              .values(points.map((point) => ({ ...point, id: randomUUID() })));

          if (params.mapIds.length > 0) {
            yield* transaction
              .delete(eventMapToMemberTable)
              .where(inArray(eventMapToMemberTable.A, params.mapIds));
            yield* transaction
              .update(eventMapAssignmentHistoryTable)
              .set({ unassignedAt: params.killedAt })
              .where(
                and(
                  inArray(eventMapAssignmentHistoryTable.mapId, params.mapIds),
                  isNull(eventMapAssignmentHistoryTable.unassignedAt),
                ),
              );
          }

          const createdPoints = yield* transaction
            .select()
            .from(eventKillPointTable)
            .where(eq(eventKillPointTable.killId, killId));

          return {
            kill: killRows[0],
            points: createdPoints,
            clearedMapIds: params.mapIds,
          };
        }),
      ),
    );
  }

  return {
    findMaps,
    recordKill,
    updateHero,
  };
};

export type EventKillStore = ReturnType<typeof makeEventKillStore>;
