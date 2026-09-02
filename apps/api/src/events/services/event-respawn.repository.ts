import { Injectable } from "@nestjs/common";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  eventHeroNpcTable,
  eventMapAssignmentHistoryTable,
  eventMapTable,
  eventMapToMemberTable,
  eventTable,
  memberTable,
} from "#src/database/drizzle/schema";

@Injectable()
export class EventRespawnRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async findHero(guildId: string, eventId: string, heroId: string) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ hero: eventHeroNpcTable, event: eventTable })
          .from(eventHeroNpcTable)
          .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
          .where(
            and(
              eq(eventHeroNpcTable.id, heroId),
              eq(eventTable.id, eventId),
              eq(eventTable.guildId, guildId),
            ),
          )
          .limit(1),
      ),
    );
    const row = rows[0];
    return row ? { ...row.hero, event: row.event } : null;
  }

  async findHeroWithMaps(guildId: string, eventId: string, heroId: string) {
    const hero = await this.findHero(guildId, eventId, heroId);
    if (!hero) return null;
    return { ...hero, maps: await this.findMaps(heroId) };
  }

  async findFirstMemberId(guildId: string): Promise<number | null> {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ id: memberTable.id })
          .from(memberTable)
          .where(eq(memberTable.guildId, guildId))
          .limit(1),
      ),
    );
    return rows[0]?.id ?? null;
  }

  async findMaps(heroId: string) {
    const [maps, assignments] = await Promise.all([
      this.databaseRuntime.runPromise(
        Effect.flatMap(ApiDatabase, (database) =>
          database
            .select()
            .from(eventMapTable)
            .where(eq(eventMapTable.heroNpcId, heroId)),
        ),
      ),
      this.databaseRuntime.runPromise(
        Effect.flatMap(ApiDatabase, (database) =>
          database
            .select({
              mapId: eventMapToMemberTable.A,
              id: eventMapToMemberTable.B,
            })
            .from(eventMapToMemberTable)
            .innerJoin(
              eventMapTable,
              eq(eventMapTable.id, eventMapToMemberTable.A),
            )
            .where(eq(eventMapTable.heroNpcId, heroId)),
        ),
      ),
    ]);
    return maps.map((map) => ({
      ...map,
      assignedMembers: assignments
        .filter(({ mapId }) => mapId === map.id)
        .map(({ id }) => ({ id })),
    }));
  }

  clearMapAssignments(mapIds: string[], closedAt: Date) {
    if (mapIds.length === 0) return Promise.resolve();
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            yield* transaction
              .delete(eventMapToMemberTable)
              .where(inArray(eventMapToMemberTable.A, mapIds));
            yield* transaction
              .update(eventMapAssignmentHistoryTable)
              .set({ unassignedAt: closedAt })
              .where(
                and(
                  inArray(eventMapAssignmentHistoryTable.mapId, mapIds),
                  isNull(eventMapAssignmentHistoryTable.unassignedAt),
                ),
              );
          }),
        ),
      ),
    );
  }
}
