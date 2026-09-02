import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  and,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  type SQLWrapper,
} from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  eventHeroNpcTable,
  eventMapCoverageGapTable,
  eventMapTable,
  eventPresenceLogTable,
  eventRespawnWindowSummaryTable,
  eventTable,
  memberTable,
} from "#src/database/drizzle/schema";

const overlapsWindow = (
  startedAt: SQLWrapper,
  endedAt: SQLWrapper,
  windowOpenedAt: Date,
  windowClosedAt: Date,
) =>
  or(
    and(gte(startedAt, windowOpenedAt), lte(startedAt, windowClosedAt)),
    and(
      lt(startedAt, windowOpenedAt),
      or(isNull(endedAt), gt(endedAt, windowOpenedAt)),
    ),
  );

@Injectable()
export class EventSummaryRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  findMaps(heroNpcId: string) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({
            id: eventMapTable.id,
            mapName: eventMapTable.mapName,
            mapId: eventMapTable.mapId,
          })
          .from(eventMapTable)
          .where(eq(eventMapTable.heroNpcId, heroNpcId)),
      ),
    );
  }

  findPresenceLogs(
    mapIds: string[],
    windowOpenedAt: Date,
    windowClosedAt: Date,
  ) {
    if (mapIds.length === 0) return Promise.resolve([]);
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ log: eventPresenceLogTable, member: memberTable })
          .from(eventPresenceLogTable)
          .innerJoin(
            memberTable,
            eq(memberTable.id, eventPresenceLogTable.memberId),
          )
          .where(
            and(
              inArray(eventPresenceLogTable.mapId, mapIds),
              overlapsWindow(
                eventPresenceLogTable.startedAt,
                eventPresenceLogTable.endedAt,
                windowOpenedAt,
                windowClosedAt,
              ),
            ),
          )
          .pipe(
            Effect.map((rows) =>
              rows.map(({ log, member }) => ({ ...log, member })),
            ),
          ),
      ),
    );
  }

  findGaps(heroNpcId: string, windowOpenedAt: Date, windowClosedAt: Date) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(eventMapCoverageGapTable)
          .where(
            and(
              eq(eventMapCoverageGapTable.heroNpcId, heroNpcId),
              overlapsWindow(
                eventMapCoverageGapTable.startedAt,
                eventMapCoverageGapTable.endedAt,
                windowOpenedAt,
                windowClosedAt,
              ),
            ),
          ),
      ),
    );
  }

  saveSummary(options: {
    data: Omit<typeof eventRespawnWindowSummaryTable.$inferInsert, "id"> & {
      id?: string;
    };
    mapIds: string[];
    heroNpcId: string;
    windowOpenedAt: Date;
    windowClosedAt: Date;
  }) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            yield* transaction
              .insert(eventRespawnWindowSummaryTable)
              .values({ ...options.data, id: options.data.id ?? randomUUID() });
            const deletedLogs =
              options.mapIds.length === 0
                ? []
                : yield* transaction
                    .delete(eventPresenceLogTable)
                    .where(
                      and(
                        inArray(eventPresenceLogTable.mapId, options.mapIds),
                        or(
                          and(
                            gte(
                              eventPresenceLogTable.startedAt,
                              options.windowOpenedAt,
                            ),
                            lte(
                              eventPresenceLogTable.startedAt,
                              options.windowClosedAt,
                            ),
                          ),
                          and(
                            lt(
                              eventPresenceLogTable.startedAt,
                              options.windowOpenedAt,
                            ),
                            lte(
                              eventPresenceLogTable.endedAt,
                              options.windowClosedAt,
                            ),
                          ),
                        ),
                      ),
                    )
                    .returning({ id: eventPresenceLogTable.id });
            const deletedGaps = yield* transaction
              .delete(eventMapCoverageGapTable)
              .where(
                and(
                  eq(eventMapCoverageGapTable.heroNpcId, options.heroNpcId),
                  isNotNull(eventMapCoverageGapTable.endedAt),
                  lte(eventMapCoverageGapTable.endedAt, options.windowClosedAt),
                ),
              )
              .returning({ id: eventMapCoverageGapTable.id });
            return {
              deletedLogs: deletedLogs.length,
              deletedGaps: deletedGaps.length,
            };
          }),
        ),
      ),
    );
  }

  async heroExists(guildId: string, eventId: string, heroNpcId: string) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ id: eventHeroNpcTable.id })
          .from(eventHeroNpcTable)
          .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
          .where(
            and(
              eq(eventHeroNpcTable.id, heroNpcId),
              eq(eventHeroNpcTable.eventId, eventId),
              eq(eventTable.guildId, guildId),
            ),
          )
          .limit(1),
      ),
    );
    return rows.length > 0;
  }

  findSummaries(heroNpcId: string, limit: number, cursor?: string) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(eventRespawnWindowSummaryTable)
          .where(
            and(
              eq(eventRespawnWindowSummaryTable.heroNpcId, heroNpcId),
              cursor
                ? lt(eventRespawnWindowSummaryTable.id, cursor)
                : undefined,
            ),
          )
          .orderBy(desc(eventRespawnWindowSummaryTable.windowClosedAt))
          .limit(limit + 1),
      ),
    );
  }
}
