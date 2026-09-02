import { randomUUID } from "node:crypto";

import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { Effect } from "effect";
import {
  ApiDatabase,
  type ApiDatabaseValue,
} from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  eventHeroKillTable,
  eventHeroNpcTable,
  eventKillPointTable,
  eventMapAssignmentHistoryTable,
  eventMapTable,
  eventMapToMemberTable,
  eventRespawnWindowSummaryTable,
  eventTable,
  memberTable,
  memberToRoleTable,
  npcKillStatsTable,
  roleTable,
} from "#src/database/drizzle/schema";

type Database = ApiDatabaseValue;
type KillPointInsert = Omit<typeof eventKillPointTable.$inferInsert, "id">;
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
const normalizePointJson = <T extends typeof eventKillPointTable.$inferSelect>(
  point: T,
) => ({
  ...point,
  bonusBreakdown: point.bonusBreakdown as JsonValue | null,
  mapPresenceData: point.mapPresenceData as JsonValue | null,
});
const normalizeEventJson = <T extends typeof eventTable.$inferSelect>(
  event: T,
) => ({ ...event, scoringRules: event.scoringRules as JsonValue | null });

export class EventKillRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  private run<A>(operation: (database: Database) => Effect.Effect<A, unknown>) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, operation),
    );
  }

  async findEventWithHeroes(guildId: string, eventId: string) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(eventTable)
        .where(and(eq(eventTable.id, eventId), eq(eventTable.guildId, guildId)))
        .limit(1),
    );
    if (!rows[0]) return null;
    const heroes = await this.run((database) =>
      database
        .select()
        .from(eventHeroNpcTable)
        .where(eq(eventHeroNpcTable.eventId, eventId)),
    );
    return { ...rows[0], heroNpcs: heroes };
  }

  async findEventWithHeroStats(guildId: string, eventId: string) {
    const event = await this.findEventWithHeroes(guildId, eventId);
    if (!event) return null;
    const heroIds = event.heroNpcs.map(({ id }) => id);
    const counts =
      heroIds.length === 0
        ? []
        : await this.run((database) =>
            database
              .select({
                heroNpcId: eventHeroKillTable.heroNpcId,
                count: sql<number>`count(*)`,
              })
              .from(eventHeroKillTable)
              .where(inArray(eventHeroKillTable.heroNpcId, heroIds))
              .groupBy(eventHeroKillTable.heroNpcId),
          );
    return {
      ...event,
      heroNpcs: event.heroNpcs.map((hero) => ({
        ...hero,
        _count: {
          kills: Number(
            counts.find(({ heroNpcId }) => heroNpcId === hero.id)?.count ?? 0,
          ),
        },
      })),
    };
  }

  findNpcStats(guildId: string, world: string, npcIds: number[]) {
    if (npcIds.length === 0) return Promise.resolve([]);
    return this.run((database) =>
      database
        .selectDistinctOn([npcKillStatsTable.npcId], {
          npcId: npcKillStatsTable.npcId,
          npcProf: npcKillStatsTable.npcProf,
        })
        .from(npcKillStatsTable)
        .where(
          and(
            eq(npcKillStatsTable.guildId, guildId),
            eq(npcKillStatsTable.world, world),
            inArray(npcKillStatsTable.npcId, npcIds),
            isNotNull(npcKillStatsTable.npcProf),
          ),
        )
        .orderBy(npcKillStatsTable.npcId, desc(npcKillStatsTable.updatedAt)),
    );
  }

  updateHero(id: string, data: Partial<typeof eventHeroNpcTable.$inferInsert>) {
    return this.run((database) =>
      database
        .update(eventHeroNpcTable)
        .set(data)
        .where(eq(eventHeroNpcTable.id, id))
        .returning(),
    ).then((rows) => rows[0]);
  }

  findMaps(heroNpcId: string) {
    return this.run((database) =>
      database
        .select()
        .from(eventMapTable)
        .where(eq(eventMapTable.heroNpcId, heroNpcId)),
    );
  }
  findMapsForHeroes(heroIds: string[]) {
    if (heroIds.length === 0) return Promise.resolve([]);
    return this.run((database) =>
      database
        .select()
        .from(eventMapTable)
        .where(inArray(eventMapTable.heroNpcId, heroIds)),
    );
  }

  findAssignments(params: {
    mapIds?: string[];
    heroNpcIds?: string[];
    memberIds?: number[];
    killedAt: Date;
    overlapStart: Date;
  }) {
    if (
      params.mapIds?.length === 0 ||
      params.heroNpcIds?.length === 0 ||
      params.memberIds?.length === 0
    )
      return Promise.resolve([]);
    return this.run((database) =>
      database
        .select()
        .from(eventMapAssignmentHistoryTable)
        .where(
          and(
            params.mapIds
              ? inArray(eventMapAssignmentHistoryTable.mapId, params.mapIds)
              : undefined,
            params.heroNpcIds
              ? inArray(
                  eventMapAssignmentHistoryTable.heroNpcId,
                  params.heroNpcIds,
                )
              : undefined,
            params.memberIds
              ? inArray(
                  eventMapAssignmentHistoryTable.memberId,
                  params.memberIds,
                )
              : undefined,
            lte(eventMapAssignmentHistoryTable.assignedAt, params.killedAt),
            or(
              isNull(eventMapAssignmentHistoryTable.unassignedAt),
              gte(
                eventMapAssignmentHistoryTable.unassignedAt,
                params.overlapStart,
              ),
            ),
          ),
        )
        .orderBy(
          asc(eventMapAssignmentHistoryTable.memberId),
          asc(eventMapAssignmentHistoryTable.assignedAt),
        ),
    );
  }

  recordKill(
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
    ) => Promise<KillPointInsert[]>,
  ) {
    return this.run((database) =>
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
          const points = yield* Effect.promise(() =>
            buildPoints(assignments, killId),
          );
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

  findHero(guildId: string, eventId: string, heroId: string) {
    return this.run((database) =>
      database
        .select({ hero: eventHeroNpcTable })
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
    ).then((rows) => rows[0]?.hero ?? null);
  }
  findEvent(guildId: string, eventId: string) {
    return this.run((database) =>
      database
        .select()
        .from(eventTable)
        .where(and(eq(eventTable.id, eventId), eq(eventTable.guildId, guildId)))
        .limit(1),
    ).then((rows) => rows[0] ?? null);
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

  async findKills(params: {
    eventId: string;
    heroId?: string;
    memberId?: number;
    cursor?: string;
    limit: number;
  }) {
    const rows = await this.run((database) =>
      database
        .select({ kill: eventHeroKillTable, hero: eventHeroNpcTable })
        .from(eventHeroKillTable)
        .innerJoin(
          eventHeroNpcTable,
          eq(eventHeroNpcTable.id, eventHeroKillTable.heroNpcId),
        )
        .where(
          and(
            eq(eventHeroNpcTable.eventId, params.eventId),
            params.heroId ? eq(eventHeroNpcTable.id, params.heroId) : undefined,
            params.cursor
              ? lt(eventHeroKillTable.id, params.cursor)
              : undefined,
            params.memberId
              ? inArray(
                  eventHeroKillTable.id,
                  database
                    .select({ id: eventKillPointTable.killId })
                    .from(eventKillPointTable)
                    .where(eq(eventKillPointTable.memberId, params.memberId)),
                )
              : undefined,
          ),
        )
        .orderBy(desc(eventHeroKillTable.killedAt))
        .limit(params.limit),
    );
    return Promise.all(
      rows.map(async ({ kill, hero }) => ({
        ...kill,
        heroNpc: hero,
        points: await this.findKillPoints(kill.id, params.memberId),
      })),
    );
  }

  private findKillPoints(killId: string, memberId?: number) {
    return this.run((database) =>
      database
        .select({ point: eventKillPointTable, member: memberTable })
        .from(eventKillPointTable)
        .innerJoin(
          memberTable,
          eq(memberTable.id, eventKillPointTable.memberId),
        )
        .where(
          and(
            eq(eventKillPointTable.killId, killId),
            memberId ? eq(eventKillPointTable.memberId, memberId) : undefined,
          ),
        )
        .orderBy(desc(eventKillPointTable.createdAt)),
    ).then((rows) =>
      rows.map(({ point, member }) => ({
        ...normalizePointJson(point),
        member: {
          id: member.id,
          name: member.name,
          avatar: member.avatar,
          userId: member.userId,
        },
      })),
    );
  }

  async findKillDetail(
    guildId: string,
    eventId: string,
    heroId: string,
    killId: string,
  ) {
    const rows = await this.run((database) =>
      database
        .select({
          kill: eventHeroKillTable,
          hero: eventHeroNpcTable,
          event: eventTable,
          timerMember: memberTable,
        })
        .from(eventHeroKillTable)
        .innerJoin(
          eventHeroNpcTable,
          eq(eventHeroNpcTable.id, eventHeroKillTable.heroNpcId),
        )
        .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
        .leftJoin(
          memberTable,
          eq(memberTable.id, eventHeroKillTable.timerCreatedById),
        )
        .where(
          and(
            eq(eventHeroKillTable.id, killId),
            eq(eventHeroNpcTable.id, heroId),
            eq(eventTable.id, eventId),
            eq(eventTable.guildId, guildId),
          ),
        )
        .limit(1),
    );
    const row = rows[0];
    if (!row) return null;
    const points = await this.findKillPoints(killId);
    const memberIds = points.map(({ memberId }) => memberId);
    const roles =
      memberIds.length === 0
        ? []
        : await this.run((database) =>
            database
              .select({
                memberId: memberToRoleTable.A,
                position: roleTable.position,
                color: roleTable.color,
              })
              .from(memberToRoleTable)
              .innerJoin(roleTable, eq(roleTable.id, memberToRoleTable.B))
              .where(inArray(memberToRoleTable.A, memberIds))
              .orderBy(desc(roleTable.position)),
          );
    return {
      ...row.kill,
      heroNpc: { ...row.hero, event: normalizeEventJson(row.event) },
      timerCreatedBy: row.timerMember
        ? {
            id: row.timerMember.id,
            name: row.timerMember.name,
            avatar: row.timerMember.avatar,
            userId: row.timerMember.userId,
          }
        : null,
      points: points.map((point) => ({
        ...point,
        member: {
          ...point.member,
          roles: roles
            .filter(({ memberId }) => memberId === point.memberId)
            .slice(0, 1)
            .map(({ position, color }) => ({ position, color })),
        },
      })),
    };
  }

  findWindowSummaries(killIds: string[]) {
    if (killIds.length === 0) return Promise.resolve([]);
    return this.run((database) =>
      database
        .select()
        .from(eventRespawnWindowSummaryTable)
        .where(inArray(eventRespawnWindowSummaryTable.killId, killIds)),
    );
  }
  findWindowSummary(killId: string) {
    return this.run((database) =>
      database
        .select()
        .from(eventRespawnWindowSummaryTable)
        .where(eq(eventRespawnWindowSummaryTable.killId, killId))
        .limit(1),
    ).then((rows) => rows[0] ?? null);
  }

  async findTimelineAssignments(params: {
    mapIds: string[];
    killedAt: Date;
    overlapStart: Date;
  }) {
    if (params.mapIds.length === 0) return [];
    return this.run((database) =>
      database
        .select({
          assignment: eventMapAssignmentHistoryTable,
          member: memberTable,
        })
        .from(eventMapAssignmentHistoryTable)
        .innerJoin(
          memberTable,
          eq(memberTable.id, eventMapAssignmentHistoryTable.memberId),
        )
        .where(
          and(
            inArray(eventMapAssignmentHistoryTable.mapId, params.mapIds),
            lte(eventMapAssignmentHistoryTable.assignedAt, params.killedAt),
            or(
              isNull(eventMapAssignmentHistoryTable.unassignedAt),
              gte(
                eventMapAssignmentHistoryTable.unassignedAt,
                params.overlapStart,
              ),
            ),
          ),
        )
        .orderBy(
          asc(eventMapAssignmentHistoryTable.mapId),
          asc(eventMapAssignmentHistoryTable.assignedAt),
        ),
    ).then((rows) =>
      rows.map(({ assignment, member }) => ({ ...assignment, member })),
    );
  }
}
