import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { and, asc, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { Effect } from "effect";
import {
  ApiDatabase,
  type ApiDatabaseValue,
} from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  eventHeroNpcTable,
  eventMapAssignmentHistoryTable,
  eventMapCoverageGapTable,
  eventMapTable,
  eventMapToMemberTable,
  eventPresenceLogTable,
  eventTable,
  memberTable,
} from "#src/database/drizzle/schema";

type Database = ApiDatabaseValue;
type GapType = typeof eventMapCoverageGapTable.$inferSelect.gapType;

@Injectable()
export class EventTrackingRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  private run<A>(operation: (database: Database) => Effect.Effect<A, unknown>) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, operation),
    );
  }

  async findScopedMap(guildId: string, eventId: string, mapId: string) {
    const rows = await this.run((database) =>
      database
        .select({
          map: eventMapTable,
          hero: eventHeroNpcTable,
          event: eventTable,
        })
        .from(eventMapTable)
        .innerJoin(
          eventHeroNpcTable,
          eq(eventHeroNpcTable.id, eventMapTable.heroNpcId),
        )
        .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
        .where(
          and(
            eq(eventMapTable.id, mapId),
            eq(eventTable.id, eventId),
            eq(eventTable.guildId, guildId),
          ),
        )
        .limit(1),
    );
    const row = rows[0];
    if (!row) return null;
    return {
      ...row.map,
      assignedMembers: await this.findAssignedMembers(mapId),
      heroNpc: { ...row.hero, event: row.event },
    };
  }

  findMember(guildId: string, memberId: number) {
    return this.run((database) =>
      database
        .select()
        .from(memberTable)
        .where(
          and(eq(memberTable.id, memberId), eq(memberTable.guildId, guildId)),
        )
        .limit(1),
    ).then((rows) => rows[0] ?? null);
  }

  findMemberByDiscordId(discordId: string, guildId: string) {
    return this.run((database) =>
      database
        .select()
        .from(memberTable)
        .where(
          and(
            eq(memberTable.userId, discordId),
            eq(memberTable.guildId, guildId),
            eq(memberTable.active, true),
          ),
        )
        .limit(1),
    ).then((rows) => rows[0] ?? null);
  }

  async findMapWithMembers(mapId: string) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(eventMapTable)
        .where(eq(eventMapTable.id, mapId))
        .limit(1),
    );
    return rows[0]
      ? { ...rows[0], assignedMembers: await this.findAssignedMembers(mapId) }
      : null;
  }

  async assignMember(mapId: string, memberId: number) {
    await this.run((database) =>
      database
        .insert(eventMapToMemberTable)
        .values({ A: mapId, B: memberId })
        .onConflictDoNothing(),
    );
    return this.findMapWithMembers(mapId);
  }

  async unassignMember(mapId: string, memberId?: number) {
    await this.run((database) =>
      database
        .delete(eventMapToMemberTable)
        .where(
          and(
            eq(eventMapToMemberTable.A, mapId),
            memberId === undefined
              ? undefined
              : eq(eventMapToMemberTable.B, memberId),
          ),
        ),
    );
    return this.findMapWithMembers(mapId);
  }

  findOpenAssignment(mapId: string, memberId: number) {
    return this.run((database) =>
      database
        .select()
        .from(eventMapAssignmentHistoryTable)
        .where(
          and(
            eq(eventMapAssignmentHistoryTable.mapId, mapId),
            eq(eventMapAssignmentHistoryTable.memberId, memberId),
            isNull(eventMapAssignmentHistoryTable.unassignedAt),
          ),
        )
        .limit(1),
    ).then((rows) => rows[0] ?? null);
  }

  createAssignment(
    mapId: string,
    heroNpcId: string,
    memberId: number,
    assignedAt: Date,
  ) {
    return this.run((database) =>
      database
        .insert(eventMapAssignmentHistoryTable)
        .values({ id: randomUUID(), mapId, heroNpcId, memberId, assignedAt }),
    );
  }

  closeAssignments(mapId: string, unassignedAt: Date, memberId?: number) {
    return this.run((database) =>
      database
        .update(eventMapAssignmentHistoryTable)
        .set({ unassignedAt })
        .where(
          and(
            eq(eventMapAssignmentHistoryTable.mapId, mapId),
            memberId === undefined
              ? undefined
              : eq(eventMapAssignmentHistoryTable.memberId, memberId),
            isNull(eventMapAssignmentHistoryTable.unassignedAt),
          ),
        ),
    );
  }

  findOpenGap(mapId: string, gapType?: GapType) {
    return this.run((database) =>
      database
        .select()
        .from(eventMapCoverageGapTable)
        .where(
          and(
            eq(eventMapCoverageGapTable.mapId, mapId),
            gapType ? eq(eventMapCoverageGapTable.gapType, gapType) : undefined,
            isNull(eventMapCoverageGapTable.endedAt),
          ),
        )
        .limit(1),
    ).then((rows) => rows[0] ?? null);
  }

  createGap(
    mapId: string,
    heroNpcId: string,
    gapType: GapType,
    startedAt: Date,
  ) {
    return this.run((database) =>
      database
        .insert(eventMapCoverageGapTable)
        .values({ id: randomUUID(), mapId, heroNpcId, gapType, startedAt }),
    );
  }

  closeGap(id: string, endedAt: Date, durationSeconds: number) {
    return this.run((database) =>
      database
        .update(eventMapCoverageGapTable)
        .set({ endedAt, durationSeconds })
        .where(eq(eventMapCoverageGapTable.id, id)),
    );
  }

  findOpenGapsForHero(heroNpcId: string) {
    return this.run((database) =>
      database
        .select()
        .from(eventMapCoverageGapTable)
        .where(
          and(
            eq(eventMapCoverageGapTable.heroNpcId, heroNpcId),
            isNull(eventMapCoverageGapTable.endedAt),
          ),
        ),
    );
  }

  closeGaps(gaps: Array<{ id: string; startedAt: Date }>, endedAt: Date) {
    return this.run((database) =>
      database.transaction((transaction) =>
        Effect.forEach(gaps, (gap) =>
          transaction
            .update(eventMapCoverageGapTable)
            .set({
              endedAt,
              durationSeconds: Math.round(
                (endedAt.getTime() - gap.startedAt.getTime()) / 1000,
              ),
            })
            .where(eq(eventMapCoverageGapTable.id, gap.id)),
        ),
      ),
    );
  }

  findMapGaps(mapId: string) {
    return this.run((database) =>
      database
        .select()
        .from(eventMapCoverageGapTable)
        .where(eq(eventMapCoverageGapTable.mapId, mapId))
        .orderBy(desc(eventMapCoverageGapTable.startedAt)),
    );
  }

  findHeroGaps(heroNpcId: string) {
    return this.run((database) =>
      database
        .select({
          gap: eventMapCoverageGapTable,
          mapName: eventMapTable.mapName,
          mapNumericId: eventMapTable.mapId,
        })
        .from(eventMapCoverageGapTable)
        .innerJoin(
          eventMapTable,
          eq(eventMapTable.id, eventMapCoverageGapTable.mapId),
        )
        .where(eq(eventMapCoverageGapTable.heroNpcId, heroNpcId))
        .orderBy(desc(eventMapCoverageGapTable.startedAt)),
    ).then((rows) =>
      rows.map(({ gap, mapName, mapNumericId }) => ({
        ...gap,
        map: { mapName, mapId: mapNumericId },
      })),
    );
  }

  findHero(guildId: string, eventId: string, heroNpcId: string) {
    return this.run((database) =>
      database
        .select({ hero: eventHeroNpcTable })
        .from(eventHeroNpcTable)
        .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
        .where(
          and(
            eq(eventHeroNpcTable.id, heroNpcId),
            eq(eventTable.id, eventId),
            eq(eventTable.guildId, guildId),
          ),
        )
        .limit(1),
    ).then((rows) => rows[0]?.hero ?? null);
  }

  findActiveHeroGaps(heroNpcId: string) {
    return this.run((database) =>
      database
        .select()
        .from(eventMapCoverageGapTable)
        .where(
          and(
            eq(eventMapCoverageGapTable.heroNpcId, heroNpcId),
            isNull(eventMapCoverageGapTable.endedAt),
          ),
        ),
    );
  }

  async findActiveMapsByName(guildId: string, mapName: string, now: Date) {
    const rows = await this.run((database) =>
      database
        .select({
          map: eventMapTable,
          hero: eventHeroNpcTable,
          event: eventTable,
        })
        .from(eventMapTable)
        .innerJoin(
          eventHeroNpcTable,
          eq(eventHeroNpcTable.id, eventMapTable.heroNpcId),
        )
        .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
        .where(
          and(
            eq(eventMapTable.mapName, mapName),
            eq(eventTable.guildId, guildId),
            or(isNull(eventTable.startsAt), lte(eventTable.startsAt, now)),
            or(isNull(eventTable.endsAt), gt(eventTable.endsAt, now)),
          ),
        ),
    );
    return Promise.all(
      rows.map(async ({ map, hero, event }) => ({
        ...map,
        assignedMembers: await this.findAssignedMembers(map.id),
        heroNpc: { ...hero, event },
      })),
    );
  }

  closePresence(mapId: string, memberId: number, endedAt: Date) {
    return this.run((database) =>
      database
        .update(eventPresenceLogTable)
        .set({ endedAt })
        .where(
          and(
            eq(eventPresenceLogTable.mapId, mapId),
            eq(eventPresenceLogTable.memberId, memberId),
            isNull(eventPresenceLogTable.endedAt),
          ),
        )
        .returning({ id: eventPresenceLogTable.id }),
    ).then((rows) => ({ count: rows.length }));
  }

  createPresence(mapId: string, memberId: number, isAfk: boolean) {
    return this.run((database) =>
      database
        .insert(eventPresenceLogTable)
        .values({ id: randomUUID(), mapId, memberId, isAfk }),
    );
  }

  findActiveNonAfkLogs(mapIds: string[]) {
    if (mapIds.length === 0) return Promise.resolve([]);
    return this.run((database) =>
      database
        .selectDistinct({
          mapId: eventPresenceLogTable.mapId,
          memberId: eventPresenceLogTable.memberId,
        })
        .from(eventPresenceLogTable)
        .where(
          and(
            inArray(eventPresenceLogTable.mapId, mapIds),
            isNull(eventPresenceLogTable.endedAt),
            eq(eventPresenceLogTable.isAfk, false),
          ),
        ),
    );
  }

  findActiveLogs(mapId: string) {
    return this.run((database) =>
      database
        .selectDistinct({ memberId: eventPresenceLogTable.memberId })
        .from(eventPresenceLogTable)
        .where(
          and(
            eq(eventPresenceLogTable.mapId, mapId),
            isNull(eventPresenceLogTable.endedAt),
          ),
        ),
    );
  }

  async findHeroForPresenceStats(
    guildId: string,
    eventId: string,
    heroNpcId: string,
  ) {
    const rows = await this.run((database) =>
      database
        .select({ hero: eventHeroNpcTable, event: eventTable })
        .from(eventHeroNpcTable)
        .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
        .where(
          and(
            eq(eventHeroNpcTable.id, heroNpcId),
            eq(eventTable.id, eventId),
            eq(eventTable.guildId, guildId),
          ),
        )
        .limit(1),
    );
    const row = rows[0];
    if (!row) return null;
    const maps = await this.run((database) =>
      database
        .select()
        .from(eventMapTable)
        .where(eq(eventMapTable.heroNpcId, heroNpcId)),
    );
    return {
      ...row.hero,
      event: row.event,
      maps: await Promise.all(
        maps.map(async (map) => ({
          ...map,
          assignedMembers: await this.findAssignedMembers(map.id),
        })),
      ),
    };
  }

  findPresenceLogs(mapIds: string[]) {
    if (mapIds.length === 0) return Promise.resolve([]);
    return this.run((database) =>
      database
        .select({ log: eventPresenceLogTable, member: memberTable })
        .from(eventPresenceLogTable)
        .innerJoin(
          memberTable,
          eq(memberTable.id, eventPresenceLogTable.memberId),
        )
        .where(inArray(eventPresenceLogTable.mapId, mapIds))
        .orderBy(asc(eventPresenceLogTable.startedAt)),
    ).then((rows) =>
      rows.map(({ log, member }) => ({
        ...log,
        member: { id: member.id, name: member.name, avatar: member.avatar },
      })),
    );
  }

  private findAssignedMembers(mapId: string) {
    return this.run((database) =>
      database
        .select({ member: memberTable })
        .from(eventMapToMemberTable)
        .innerJoin(memberTable, eq(memberTable.id, eventMapToMemberTable.B))
        .where(eq(eventMapToMemberTable.A, mapId)),
    ).then((rows) => rows.map(({ member }) => member));
  }
}
