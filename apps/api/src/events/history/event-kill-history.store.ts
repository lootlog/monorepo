import { takeKeysetPage } from "#src/shared/keyset-page";
import { topMemberDisplayRoles } from "#src/members/member-display-role";
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  getTableColumns,
  getColumns,
  gte,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Effect, Schema } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  eventHeroKillTable,
  eventHeroNpcTable,
  eventKillPointTable,
  eventMapAssignmentHistoryTable,
  eventMapTable,
  eventRespawnWindowSummaryTable,
  eventTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";
import type { HistoryBoundary } from "#src/events/history/event-kill-history.cursor";

const MapPresenceSnapshot = Schema.Array(
  Schema.StructWithRest(
    Schema.Struct({
      mapId: Schema.String,
      mapName: Schema.String,
      presenceTimeSeconds: Schema.Number,
      afkTimeSeconds: Schema.Number,
    }),
    [Schema.Record(Schema.String, Schema.Unknown)],
  ),
);

const decodeMapPresence = Schema.decodeUnknownSync(
  Schema.NullOr(MapPresenceSnapshot),
);

const GapTimelineSnapshot = Schema.Array(
  Schema.StructWithRest(
    Schema.Struct({
      mapId: Schema.String,
      mapName: Schema.String,
      gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
      startedAt: Schema.Union([Schema.String, Schema.Date]),
      endedAt: Schema.NullOr(Schema.Union([Schema.String, Schema.Date])),
      durationSeconds: Schema.Number,
    }),
    [Schema.Record(Schema.String, Schema.Unknown)],
  ),
);

const decodeGapTimeline = Schema.decodeUnknownSync(GapTimelineSnapshot);

export type HistoryStoreScope = {
  guildId: string;
  eventId: string;
  heroIds: string[];
};

type HistoryPageQuery = {
  limit: number;
  boundary?: HistoryBoundary;
  memberId?: number;
};

export const makeEventKillHistoryStore = (
  database: ApiDatabaseValue,
  scope: HistoryStoreScope,
) => {
  const scopedHeroes = database
    .select({ id: eventHeroNpcTable.id })
    .from(eventHeroNpcTable)
    .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
    .where(
      and(
        eq(eventTable.guildId, scope.guildId),
        eq(eventTable.id, scope.eventId),
        inArray(eventHeroNpcTable.id, scope.heroIds),
      ),
    );

  const killScope = inArray(eventHeroKillTable.heroNpcId, scopedHeroes);

  const pageConditions = (query: HistoryPageQuery) =>
    and(
      killScope,
      // Drizzle has no row comparison; PostgreSQL can seek the complete tuple in the ordering index.
      query.boundary
        ? sql`(${eventHeroKillTable.killedAt}, ${eventHeroKillTable.id}) < (${query.boundary.killedAt.toISOString()}::timestamp, ${query.boundary.id})`
        : undefined,
      query.memberId === undefined
        ? undefined
        : exists(
            database
              .select({ id: eventKillPointTable.id })
              .from(eventKillPointTable)
              .innerJoin(
                memberTable,
                eq(memberTable.id, eventKillPointTable.memberId),
              )
              .where(
                and(
                  eq(eventKillPointTable.killId, eventHeroKillTable.id),
                  eq(eventKillPointTable.memberId, query.memberId),
                  eq(memberTable.guildId, scope.guildId),
                ),
              ),
          ),
    );

  const orderedKills = (query: HistoryPageQuery) =>
    database
      .select()
      .from(eventHeroKillTable)
      .where(pageConditions(query))
      .orderBy(desc(eventHeroKillTable.killedAt), desc(eventHeroKillTable.id))
      .limit(query.limit + 1);

  // TODO(kill-history-legacy): Remove this full-row page adapter; orderedKills still serves findLeanPage.
  const findPage = (query: HistoryPageQuery) =>
    orderedKills(query).pipe(
      Effect.map((rows) => {
        const { rows: kills, hasMore } = takeKeysetPage(rows, query.limit);

        return { kills, hasMore };
      }),
    );

  const findLeanPage = (query: HistoryPageQuery) => {
    const page = database.$with("history_page").as(orderedKills(query));

    const counts = database.$with("history_participants").as(
      database
        .select({
          killId: eventKillPointTable.killId,
          participantCount: count().as("participant_count"),
        })
        .from(eventKillPointTable)
        .innerJoin(page, eq(page.id, eventKillPointTable.killId))
        .innerJoin(
          memberTable,
          eq(memberTable.id, eventKillPointTable.memberId),
        )
        .where(eq(memberTable.guildId, scope.guildId))
        .groupBy(eventKillPointTable.killId),
    );

    const selection = {
      kill: getColumns(page),
      heroNpc: {
        id: eventHeroNpcTable.id,
        npcId: eventHeroNpcTable.npcId,
        npcName: eventHeroNpcTable.npcName,
        npcIcon: eventHeroNpcTable.npcIcon,
        npcLvl: eventHeroNpcTable.npcLvl,
      },
      participantCount:
        sql<number>`coalesce(${counts.participantCount}, 0)`.mapWith(Number),
    };

    if (query.memberId === undefined) {
      return database
        .with(page, counts)
        .select(selection)
        .from(page)
        .innerJoin(eventHeroNpcTable, eq(eventHeroNpcTable.id, page.heroNpcId))
        .leftJoin(counts, eq(counts.killId, page.id))
        .orderBy(desc(page.killedAt), desc(page.id))
        .pipe(
          Effect.map((rows) => ({
            kind: "event" as const,
            ...takeKeysetPage(rows, query.limit),
          })),
        );
    }

    const memberPoint = alias(eventKillPointTable, "history_member_point");

    return database
      .with(page, counts)
      .select({
        ...selection,
        memberPoint: {
          points: memberPoint.points,
          basePoints: memberPoint.basePoints,
          manualAdjustmentPoints: memberPoint.manualAdjustmentPoints,
          bonusBreakdown: memberPoint.bonusBreakdown,
          trackingDurationSeconds: memberPoint.trackingDurationSeconds,
          trackingDurationPercentage: memberPoint.trackingDurationPercentage,
        },
      })
      .from(page)
      .innerJoin(eventHeroNpcTable, eq(eventHeroNpcTable.id, page.heroNpcId))
      .leftJoin(counts, eq(counts.killId, page.id))
      .innerJoin(
        memberPoint,
        and(
          eq(memberPoint.killId, page.id),
          eq(memberPoint.memberId, query.memberId),
        ),
      )
      .orderBy(desc(page.killedAt), desc(page.id))
      .pipe(
        Effect.map((rows) => ({
          kind: "member" as const,
          ...takeKeysetPage(rows, query.limit),
        })),
      );
  };

  // TODO(kill-history-legacy): Remove UUID anchor lookup when the three old lists are retired.
  const findAnchor = (id: string, memberId?: number) =>
    database
      .select({
        id: eventHeroKillTable.id,
        killedAt: eventHeroKillTable.killedAt,
      })
      .from(eventHeroKillTable)
      .where(
        and(
          eq(eventHeroKillTable.id, id),
          pageConditions({ limit: 1, memberId }),
        ),
      )
      .limit(1)
      .pipe(Effect.map((rows) => rows[0]));

  const findPoints = (killIds: string[], memberId?: number) => {
    if (killIds.length === 0) return Effect.succeed([]);

    return database
      .select({ point: eventKillPointTable, member: memberTable })
      .from(eventKillPointTable)
      .innerJoin(
        eventHeroKillTable,
        eq(eventHeroKillTable.id, eventKillPointTable.killId),
      )
      .innerJoin(memberTable, eq(memberTable.id, eventKillPointTable.memberId))
      .where(
        and(
          killScope,
          eq(memberTable.guildId, scope.guildId),
          inArray(eventKillPointTable.killId, killIds),
          memberId === undefined
            ? undefined
            : eq(eventKillPointTable.memberId, memberId),
        ),
      )
      .orderBy(
        desc(eventKillPointTable.createdAt),
        desc(eventKillPointTable.id),
      )
      .pipe(
        Effect.map((rows) =>
          rows.map(({ point, member }) => ({
            ...point,
            mapPresenceData: decodeMapPresence(point.mapPresenceData),
            member: {
              id: member.id,
              name: member.name,
              avatar: member.avatar,
              userId: member.userId,
            },
          })),
        ),
      );
  };

  // TODO(kill-history-legacy): Remove this legacy page hydration query; retain scopedHeroes.
  const findHeroes = () =>
    database
      .select()
      .from(eventHeroNpcTable)
      .where(inArray(eventHeroNpcTable.id, scopedHeroes));

  const findKill = (heroId: string, killId: string) =>
    database
      .select()
      .from(eventHeroKillTable)
      .where(
        and(
          killScope,
          eq(eventHeroKillTable.heroNpcId, heroId),
          eq(eventHeroKillTable.id, killId),
        ),
      )
      .limit(1)
      .pipe(Effect.map((rows) => rows[0]));

  const findKillDetail = Effect.fnUntraced(function* (
    heroId: string,
    killId: string,
  ) {
    const rows = yield* database
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
        and(
          eq(memberTable.id, eventHeroKillTable.timerCreatedById),
          eq(memberTable.guildId, scope.guildId),
        ),
      )
      .where(
        and(
          killScope,
          eq(eventHeroKillTable.id, killId),
          eq(eventHeroNpcTable.id, heroId),
        ),
      )
      .limit(1);

    const row = rows[0];

    if (!row) return null;
    const points = yield* findPoints([killId]);
    const memberIds = points.map((point) => point.memberId);

    const roles =
      memberIds.length === 0
        ? []
        : yield* database
            .select({
              memberId: memberToRoleTable.A,
              position: roleTable.position,
              color: roleTable.color,
            })
            .from(memberToRoleTable)
            .innerJoin(roleTable, eq(roleTable.id, memberToRoleTable.B))
            .where(
              and(
                inArray(memberToRoleTable.A, memberIds),
                eq(roleTable.guildId, scope.guildId),
              ),
            )
            .orderBy(desc(roleTable.position), asc(roleTable.id));

    return {
      ...row.kill,
      heroNpc: { ...row.hero, event: row.event },
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
          roles: topMemberDisplayRoles(roles, point.memberId),
        },
      })),
    };
  });

  const findMapsForHeroes = (heroIds: string[]) =>
    database
      .select()
      .from(eventMapTable)
      .where(
        and(
          inArray(eventMapTable.heroNpcId, scopedHeroes),
          inArray(eventMapTable.heroNpcId, heroIds),
        ),
      );

  const findMaps = (heroId: string) => findMapsForHeroes([heroId]);

  const findAssignments = (params: {
    mapIds?: string[];
    heroNpcIds?: string[];
    memberIds?: number[];
    killedAt: Date;
    overlapStart: Date;
  }) =>
    database
      .select(getTableColumns(eventMapAssignmentHistoryTable))
      .from(eventMapAssignmentHistoryTable)
      .innerJoin(
        memberTable,
        eq(memberTable.id, eventMapAssignmentHistoryTable.memberId),
      )
      .where(
        and(
          inArray(eventMapAssignmentHistoryTable.heroNpcId, scopedHeroes),
          eq(memberTable.guildId, scope.guildId),
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
            ? inArray(eventMapAssignmentHistoryTable.memberId, params.memberIds)
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
      );

  const findWindowSummaries = (killIds: string[]) =>
    database
      .select(getTableColumns(eventRespawnWindowSummaryTable))
      .from(eventRespawnWindowSummaryTable)
      .innerJoin(
        eventHeroKillTable,
        eq(eventHeroKillTable.id, eventRespawnWindowSummaryTable.killId),
      )
      .where(
        and(killScope, inArray(eventRespawnWindowSummaryTable.killId, killIds)),
      );

  const findWindowSummary = (killId: string) =>
    findWindowSummaries([killId]).pipe(
      Effect.map((rows) =>
        rows[0]
          ? {
              ...rows[0],
              gapsTimeline: decodeGapTimeline(rows[0].gapsTimeline),
            }
          : null,
      ),
    );

  const findTimelineAssignments = (params: {
    mapIds: string[];
    killedAt: Date;
    overlapStart: Date;
  }) =>
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
          inArray(eventMapAssignmentHistoryTable.heroNpcId, scopedHeroes),
          eq(memberTable.guildId, scope.guildId),
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
      )
      .pipe(
        Effect.map((rows) =>
          rows.map(({ assignment, member }) => ({ ...assignment, member })),
        ),
      );

  return {
    findPage,
    findLeanPage,
    findAnchor,
    findPoints,
    findHeroes,
    findKill,
    findKillDetail,
    findMaps,
    findMapsForHeroes,
    findAssignments,
    findWindowSummaries,
    findWindowSummary,
    findTimelineAssignments,
  };
};

export type EventKillHistoryStore = ReturnType<
  typeof makeEventKillHistoryStore
>;

export type LeanHistoryRow = Effect.Success<
  ReturnType<EventKillHistoryStore["findLeanPage"]>
>["rows"][number];
