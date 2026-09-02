import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  ne,
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
  eventPointsEditHistoryTable,
  eventPresenceLogTable,
  eventRankingTable,
  eventRespawnWindowSummaryTable,
  eventTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";

type Database = ApiDatabaseValue;
type RankingInsert = typeof eventRankingTable.$inferInsert;
type KillPointUpdate = Partial<typeof eventKillPointTable.$inferInsert>;
type RankingUpdate = Partial<typeof eventRankingTable.$inferInsert>;

@Injectable()
export class EventPointsRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  private run<A>(operation: (database: Database) => Effect.Effect<A, unknown>) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, operation),
    );
  }

  findEvent(eventId: string, guildId?: string) {
    return this.run((database) =>
      database
        .select()
        .from(eventTable)
        .where(
          and(
            eq(eventTable.id, eventId),
            guildId ? eq(eventTable.guildId, guildId) : undefined,
          ),
        )
        .limit(1),
    ).then((rows) => rows[0] ?? null);
  }

  async findRanking(eventId: string) {
    const rows = await this.run((database) =>
      database
        .select({ ranking: eventRankingTable, member: memberTable })
        .from(eventRankingTable)
        .innerJoin(memberTable, eq(memberTable.id, eventRankingTable.memberId))
        .where(eq(eventRankingTable.eventId, eventId))
        .orderBy(desc(eventRankingTable.totalPoints)),
    );
    const memberIds = rows.map(({ member }) => member.id);
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
    return rows.map(({ ranking, member }) => ({
      ...ranking,
      member: {
        id: member.id,
        name: member.name,
        roles: roles
          .filter(({ memberId }) => memberId === member.id)
          .slice(0, 1)
          .map(({ position, color }) => ({ position, color })),
      },
    }));
  }

  findRankings(eventId: string) {
    return this.run((database) =>
      database
        .select()
        .from(eventRankingTable)
        .where(eq(eventRankingTable.eventId, eventId)),
    );
  }

  findRankingByKey(eventId: string, memberId: number, heroNpcName: string) {
    return this.run((database) =>
      database
        .select()
        .from(eventRankingTable)
        .where(
          and(
            eq(eventRankingTable.eventId, eventId),
            eq(eventRankingTable.memberId, memberId),
            eq(eventRankingTable.heroNpcName, heroNpcName),
          ),
        )
        .limit(1),
    ).then((rows) => rows[0] ?? null);
  }

  findScopedRanking(guildId: string, eventId: string, rankingId: string) {
    return this.run((database) =>
      database
        .select({ ranking: eventRankingTable })
        .from(eventRankingTable)
        .innerJoin(eventTable, eq(eventTable.id, eventRankingTable.eventId))
        .where(
          and(
            eq(eventRankingTable.id, rankingId),
            eq(eventTable.id, eventId),
            eq(eventTable.guildId, guildId),
          ),
        )
        .limit(1),
    ).then((rows) => rows[0]?.ranking ?? null);
  }

  createRanking(data: Omit<RankingInsert, "id" | "updatedAt">) {
    return this.run((database) =>
      database
        .insert(eventRankingTable)
        .values({ ...data, id: randomUUID(), updatedAt: new Date() })
        .returning(),
    ).then((rows) => rows[0]);
  }

  updateRanking(id: string, data: RankingUpdate) {
    return this.run((database) =>
      database
        .update(eventRankingTable)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(eventRankingTable.id, id))
        .returning(),
    ).then((rows) => rows[0]);
  }

  incrementRanking(
    id: string,
    points: number,
    time: number,
    afk: number,
    pointsModified: boolean,
  ) {
    return this.run((database) =>
      database
        .update(eventRankingTable)
        .set({
          totalPoints: sql`${eventRankingTable.totalPoints} + ${points}`,
          totalKills: sql`${eventRankingTable.totalKills} + 1`,
          totalTimeSeconds: sql`${eventRankingTable.totalTimeSeconds} + ${time}`,
          avgAfkPercentage: afk,
          pointsModified,
          updatedAt: new Date(),
        })
        .where(eq(eventRankingTable.id, id)),
    );
  }

  deleteRanking(id: string) {
    return this.run((database) =>
      database.delete(eventRankingTable).where(eq(eventRankingTable.id, id)),
    );
  }

  async findKillPointsForEvent(eventId: string) {
    const rows = await this.run((database) =>
      database
        .select({
          point: eventKillPointTable,
          kill: eventHeroKillTable,
          hero: eventHeroNpcTable,
        })
        .from(eventKillPointTable)
        .innerJoin(
          eventHeroKillTable,
          eq(eventHeroKillTable.id, eventKillPointTable.killId),
        )
        .innerJoin(
          eventHeroNpcTable,
          eq(eventHeroNpcTable.id, eventHeroKillTable.heroNpcId),
        )
        .where(eq(eventHeroNpcTable.eventId, eventId)),
    );
    const heroIds = [...new Set(rows.map(({ hero }) => hero.id))];
    const maps =
      heroIds.length === 0
        ? []
        : await this.run((database) =>
            database
              .select()
              .from(eventMapTable)
              .where(inArray(eventMapTable.heroNpcId, heroIds)),
          );
    return rows.map(({ point, kill, hero }) => ({
      ...point,
      kill: {
        ...kill,
        heroNpc: {
          ...hero,
          maps: maps
            .filter(({ heroNpcId }) => heroNpcId === hero.id)
            .map(({ id }) => ({ id })),
        },
      },
    }));
  }

  findManualKillPoints(eventId: string, memberId: number, heroNpcName: string) {
    return this.run((database) =>
      database
        .select({
          confirmationDeadlineAt: eventKillPointTable.confirmationDeadlineAt,
          confirmedAt: eventKillPointTable.confirmedAt,
        })
        .from(eventKillPointTable)
        .innerJoin(
          eventHeroKillTable,
          eq(eventHeroKillTable.id, eventKillPointTable.killId),
        )
        .innerJoin(
          eventHeroNpcTable,
          eq(eventHeroNpcTable.id, eventHeroKillTable.heroNpcId),
        )
        .where(
          and(
            eq(eventKillPointTable.memberId, memberId),
            ne(eventKillPointTable.manualAdjustmentPoints, 0),
            eq(eventHeroNpcTable.eventId, eventId),
            eq(eventHeroNpcTable.npcName, heroNpcName),
          ),
        ),
    );
  }

  findWindowSummaries(killIds: string[]) {
    if (killIds.length === 0) return Promise.resolve([]);
    return this.run((database) =>
      database
        .select({
          killId: eventRespawnWindowSummaryTable.killId,
          windowOpenedAt: eventRespawnWindowSummaryTable.windowOpenedAt,
        })
        .from(eventRespawnWindowSummaryTable)
        .where(inArray(eventRespawnWindowSummaryTable.killId, killIds)),
    );
  }

  findAssignments(
    mapIds: string[],
    memberIds: number[],
    latest: Date,
    earliest: Date,
  ) {
    if (mapIds.length === 0 || memberIds.length === 0)
      return Promise.resolve([]);
    return this.run((database) =>
      database
        .select({
          mapId: eventMapAssignmentHistoryTable.mapId,
          memberId: eventMapAssignmentHistoryTable.memberId,
          assignedAt: eventMapAssignmentHistoryTable.assignedAt,
          unassignedAt: eventMapAssignmentHistoryTable.unassignedAt,
        })
        .from(eventMapAssignmentHistoryTable)
        .where(
          and(
            inArray(eventMapAssignmentHistoryTable.mapId, mapIds),
            inArray(eventMapAssignmentHistoryTable.memberId, memberIds),
            lte(eventMapAssignmentHistoryTable.assignedAt, latest),
            or(
              isNull(eventMapAssignmentHistoryTable.unassignedAt),
              gte(eventMapAssignmentHistoryTable.unassignedAt, earliest),
            ),
          ),
        )
        .orderBy(asc(eventMapAssignmentHistoryTable.assignedAt)),
    );
  }

  applyRecalculation(
    killPointUpdates: Array<{ id: string; data: KillPointUpdate }>,
    rankingUpdates: Array<
      | { kind: "update"; id: string; data: RankingUpdate }
      | { kind: "create"; data: Omit<RankingInsert, "id" | "updatedAt"> }
      | { kind: "delete"; id: string }
    >,
  ) {
    return this.run((database) =>
      database.transaction((transaction) =>
        Effect.gen(function* () {
          for (const item of killPointUpdates)
            yield* transaction
              .update(eventKillPointTable)
              .set(item.data)
              .where(eq(eventKillPointTable.id, item.id));
          for (const item of rankingUpdates) {
            if (item.kind === "update")
              yield* transaction
                .update(eventRankingTable)
                .set({ ...item.data, updatedAt: new Date() })
                .where(eq(eventRankingTable.id, item.id));
            else if (item.kind === "create")
              yield* transaction.insert(eventRankingTable).values({
                ...item.data,
                id: randomUUID(),
                updatedAt: new Date(),
              });
            else
              yield* transaction
                .delete(eventRankingTable)
                .where(eq(eventRankingTable.id, item.id));
          }
        }),
      ),
    );
  }

  findMaps(heroNpcId: string) {
    return this.run((database) =>
      database
        .select({ id: eventMapTable.id, mapName: eventMapTable.mapName })
        .from(eventMapTable)
        .where(eq(eventMapTable.heroNpcId, heroNpcId)),
    );
  }

  findPresenceLogs(
    mapIds: string[],
    memberIds: number[] | undefined,
    since?: Date,
  ) {
    if (mapIds.length === 0) return Promise.resolve([]);
    return this.run((database) =>
      database
        .select()
        .from(eventPresenceLogTable)
        .where(
          and(
            inArray(eventPresenceLogTable.mapId, mapIds),
            memberIds
              ? inArray(eventPresenceLogTable.memberId, memberIds)
              : undefined,
            since
              ? or(
                  gte(eventPresenceLogTable.startedAt, since),
                  gte(eventPresenceLogTable.endedAt, since),
                  and(
                    isNull(eventPresenceLogTable.endedAt),
                    lte(eventPresenceLogTable.startedAt, since),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(
          asc(eventPresenceLogTable.memberId),
          asc(eventPresenceLogTable.startedAt),
        ),
    );
  }

  async findParticipationPoints(
    eventId: string,
    memberId: number,
    now: Date,
    expired: boolean,
  ) {
    const rows = await this.run((database) =>
      database
        .select({
          point: eventKillPointTable,
          kill: eventHeroKillTable,
          hero: eventHeroNpcTable,
        })
        .from(eventKillPointTable)
        .innerJoin(
          eventHeroKillTable,
          eq(eventHeroKillTable.id, eventKillPointTable.killId),
        )
        .innerJoin(
          eventHeroNpcTable,
          eq(eventHeroNpcTable.id, eventHeroKillTable.heroNpcId),
        )
        .where(
          and(
            eq(eventKillPointTable.memberId, memberId),
            isNull(eventKillPointTable.confirmedAt),
            expired
              ? isNull(eventKillPointTable.confirmationExpiredAcknowledgedAt)
              : undefined,
            expired
              ? lt(eventKillPointTable.confirmationDeadlineAt, now)
              : gte(eventKillPointTable.confirmationDeadlineAt, now),
            eq(eventHeroNpcTable.eventId, eventId),
          ),
        )
        .orderBy(
          expired
            ? desc(eventKillPointTable.confirmationDeadlineAt)
            : asc(eventKillPointTable.confirmationDeadlineAt),
        ),
    );
    return rows.map(({ point, kill, hero }) => ({
      ...point,
      kill: { killedAt: kill.killedAt, heroNpc: hero },
    }));
  }

  acknowledgeExpired(
    guildId: string,
    eventId: string,
    memberId: number,
    killIds: string[],
    at: Date,
  ) {
    return this.run((database) =>
      database
        .update(eventKillPointTable)
        .set({ confirmationExpiredAcknowledgedAt: at })
        .from(eventHeroKillTable)
        .innerJoin(
          eventHeroNpcTable,
          eq(eventHeroNpcTable.id, eventHeroKillTable.heroNpcId),
        )
        .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
        .where(
          and(
            inArray(eventKillPointTable.killId, killIds),
            eq(eventKillPointTable.memberId, memberId),
            isNull(eventKillPointTable.confirmedAt),
            lt(eventKillPointTable.confirmationDeadlineAt, at),
            isNull(eventKillPointTable.confirmationExpiredAcknowledgedAt),
            eq(eventTable.id, eventId),
            eq(eventTable.guildId, guildId),
          ),
        )
        .returning({ id: eventKillPointTable.id }),
    ).then((rows) => rows.length);
  }

  findMemberKillPoints(
    guildId: string,
    eventId: string,
    killId: string,
    memberId: number,
  ) {
    return this.run((database) =>
      database
        .select({
          point: eventKillPointTable,
          kill: eventHeroKillTable,
          hero: eventHeroNpcTable,
        })
        .from(eventKillPointTable)
        .innerJoin(
          eventHeroKillTable,
          eq(eventHeroKillTable.id, eventKillPointTable.killId),
        )
        .innerJoin(
          eventHeroNpcTable,
          eq(eventHeroNpcTable.id, eventHeroKillTable.heroNpcId),
        )
        .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
        .where(
          and(
            eq(eventKillPointTable.killId, killId),
            eq(eventKillPointTable.memberId, memberId),
            eq(eventTable.id, eventId),
            eq(eventTable.guildId, guildId),
          ),
        ),
    ).then((rows) =>
      rows.map(({ point, kill, hero }) => ({
        ...point,
        kill: { ...kill, heroNpc: { npcName: hero.npcName } },
      })),
    );
  }

  confirmPoints(ids: string[], at: Date) {
    return this.run((database) =>
      database.transaction((transaction) =>
        Effect.gen(function* () {
          yield* transaction
            .update(eventKillPointTable)
            .set({ confirmedAt: at })
            .where(
              and(
                inArray(eventKillPointTable.id, ids),
                isNull(eventKillPointTable.confirmedAt),
              ),
            );
          return yield* transaction
            .select()
            .from(eventKillPointTable)
            .where(inArray(eventKillPointTable.id, ids));
        }),
      ),
    );
  }

  findScopedKillPoint(
    guildId: string,
    eventId: string,
    killId: string,
    pointId: string,
  ) {
    return this.run((database) =>
      database
        .select({
          point: eventKillPointTable,
          kill: eventHeroKillTable,
          hero: eventHeroNpcTable,
        })
        .from(eventKillPointTable)
        .innerJoin(
          eventHeroKillTable,
          eq(eventHeroKillTable.id, eventKillPointTable.killId),
        )
        .innerJoin(
          eventHeroNpcTable,
          eq(eventHeroNpcTable.id, eventHeroKillTable.heroNpcId),
        )
        .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
        .where(
          and(
            eq(eventKillPointTable.id, pointId),
            eq(eventHeroKillTable.id, killId),
            eq(eventTable.id, eventId),
            eq(eventTable.guildId, guildId),
          ),
        )
        .limit(1),
    ).then((rows) =>
      rows[0]
        ? { ...rows[0].point, kill: { ...rows[0].kill, heroNpc: rows[0].hero } }
        : null,
    );
  }

  updateKillPoint(id: string, data: KillPointUpdate) {
    return this.run((database) =>
      database
        .update(eventKillPointTable)
        .set(data)
        .where(eq(eventKillPointTable.id, id))
        .returning(),
    ).then((rows) => rows[0]);
  }

  createHistory(
    data: Omit<typeof eventPointsEditHistoryTable.$inferInsert, "id">,
  ) {
    return this.run((database) =>
      database
        .insert(eventPointsEditHistoryTable)
        .values({ ...data, id: randomUUID() }),
    );
  }

  findHistories(guildId: string, eventId: string, rankingIds: string[]) {
    if (rankingIds.length === 0) return Promise.resolve([]);
    return this.run((database) =>
      database
        .select({ history: eventPointsEditHistoryTable })
        .from(eventPointsEditHistoryTable)
        .innerJoin(
          eventRankingTable,
          eq(eventRankingTable.id, eventPointsEditHistoryTable.rankingId),
        )
        .innerJoin(eventTable, eq(eventTable.id, eventRankingTable.eventId))
        .where(
          and(
            inArray(eventPointsEditHistoryTable.rankingId, rankingIds),
            eq(eventTable.id, eventId),
            eq(eventTable.guildId, guildId),
          ),
        )
        .orderBy(desc(eventPointsEditHistoryTable.editedAt)),
    ).then((rows) => rows.map(({ history }) => history));
  }

  findEditors(guildId: string, ids: string[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.run((database) =>
      database
        .select({
          globalUserId: memberTable.globalUserId,
          name: memberTable.name,
        })
        .from(memberTable)
        .where(
          and(
            eq(memberTable.guildId, guildId),
            inArray(memberTable.globalUserId, ids),
          ),
        ),
    );
  }
}
