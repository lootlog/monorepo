import { readNpcKillPage } from "./npc-kill-page.js";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  and,
  desc,
  sql,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  ne,
  notInArray,
  or,
  sum,
  type SQL,
  type SQLWrapper,
} from "drizzle-orm";
import { Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  memberKillBucketTable,
  memberTable,
} from "#src/database/drizzle/schema";
import {
  guildKillSource,
  memberKillSource,
  type GuildKillSource,
  type MemberKillSource,
} from "./kill-source.js";

type NpcType = (typeof memberKillBucketTable.npcType.enumValues)[number];

export type KillStatsFilter = {
  readonly guildId?: string;
  readonly userId?: string;
  readonly memberId?: number;
  readonly npcId?: number;
  readonly world?: string;
  readonly npcType?:
    | NpcType
    | {
        readonly in?: ReadonlyArray<NpcType>;
        readonly not?: NpcType;
        readonly notIn?: ReadonlyArray<NpcType>;
      };
  readonly npcLvl?: { readonly gte?: number; readonly lte?: number };
  readonly periodStart?: { readonly gte?: Date };
  readonly npcName?: {
    readonly contains?: string;
    readonly mode?: "insensitive";
  };
  readonly AND?: ReadonlyArray<KillStatsFilter>;
  readonly OR?: ReadonlyArray<KillStatsFilter>;
};

type FilterColumns = {
  readonly guildId?: SQLWrapper;
  readonly userId?: SQLWrapper;
  readonly memberId?: SQLWrapper;
  readonly npcId?: SQLWrapper;
  readonly world: SQLWrapper;
  readonly npcType: SQLWrapper;
  readonly npcLvl: SQLWrapper;
  readonly npcName: SQLWrapper;
};

const scalarConditions = (
  columns: FilterColumns,
  filter: KillStatsFilter,
): Array<SQL | undefined> => [
  filter.guildId !== undefined && columns.guildId
    ? eq(columns.guildId, filter.guildId)
    : undefined,
  filter.userId !== undefined && columns.userId
    ? eq(columns.userId, filter.userId)
    : undefined,
  filter.memberId !== undefined && columns.memberId
    ? eq(columns.memberId, filter.memberId)
    : undefined,
  filter.npcId !== undefined && columns.npcId
    ? eq(columns.npcId, filter.npcId)
    : undefined,
  filter.world !== undefined ? eq(columns.world, filter.world) : undefined,
];

const npcConditions = (
  columns: FilterColumns,
  filter: KillStatsFilter,
): Array<SQL | undefined> => [
  typeof filter.npcType === "string"
    ? eq(columns.npcType, filter.npcType)
    : undefined,
  typeof filter.npcType === "object" && filter.npcType.in
    ? inArray(columns.npcType, [...filter.npcType.in])
    : undefined,
  typeof filter.npcType === "object" && filter.npcType.not
    ? ne(columns.npcType, filter.npcType.not)
    : undefined,
  typeof filter.npcType === "object" && filter.npcType.notIn
    ? notInArray(columns.npcType, [...filter.npcType.notIn])
    : undefined,
];

const rangeConditions = (
  columns: FilterColumns,
  filter: KillStatsFilter,
): Array<SQL | undefined> => [
  filter.npcLvl?.gte !== undefined
    ? gte(columns.npcLvl, filter.npcLvl.gte)
    : undefined,
  filter.npcLvl?.lte !== undefined
    ? lte(columns.npcLvl, filter.npcLvl.lte)
    : undefined,
  filter.npcName?.contains
    ? ilike(columns.npcName, `%${filter.npcName.contains}%`)
    : undefined,
];

export const buildKillStatsCondition = (
  columns: FilterColumns,
  filter: KillStatsFilter,
): SQL | undefined =>
  and(
    ...scalarConditions(columns, filter),
    ...npcConditions(columns, filter),
    ...rangeConditions(columns, filter),
    filter.AND
      ? and(
          ...filter.AND.map((entry) => buildKillStatsCondition(columns, entry)),
        )
      : undefined,
    filter.OR
      ? or(...filter.OR.map((entry) => buildKillStatsCondition(columns, entry)))
      : undefined,
  );

// The kill source applies `filter.periodStart`.
const memberColumns = (source: MemberKillSource): FilterColumns => ({
  guildId: source.guildId,
  userId: source.discordUserId,
  memberId: source.memberId,
  npcId: source.npcId,
  world: source.world,
  npcType: source.npcType,
  npcLvl: source.npcLvl,
  npcName: source.npcName,
});

const guildColumns = (source: GuildKillSource): FilterColumns => ({
  guildId: source.guildId,
  npcId: source.npcId,
  world: source.world,
  npcType: source.npcType,
  npcLvl: source.npcLvl,
  npcName: source.npcName,
});

const memberSource = (filter: KillStatsFilter) =>
  memberKillSource(filter.periodStart?.gte);

const guildSource = (filter: KillStatsFilter) =>
  guildKillSource(filter.periodStart?.gte);

export class KillStatsPersistenceError extends TaggedErrorClass<KillStatsPersistenceError>()(
  "KillStatsPersistenceError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

type Member = typeof memberTable.$inferSelect;

type MemberSummary = Pick<Member, "id" | "name" | "avatar" | "userId">;

export const makeKillStatsPersistence = (
  database: typeof ApiDatabase.Service,
) => {
  const protect = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new KillStatsPersistenceError({ operation, cause }),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "kills.drizzle", retryCount: 0 },
      }),
    );

  const findMembers = (
    memberIds: ReadonlyArray<number>,
  ): Effect.Effect<ReadonlyArray<MemberSummary>, KillStatsPersistenceError> =>
    memberIds.length === 0
      ? Effect.succeed([])
      : protect(
          "kills.stats.members",
          database
            .select({
              id: memberTable.id,
              name: memberTable.name,
              avatar: memberTable.avatar,
              userId: memberTable.userId,
            })
            .from(memberTable)
            .where(inArray(memberTable.id, [...memberIds])),
        );

  const findMember = (guildId: string, memberId: number) =>
    protect(
      "kills.stats.member",
      database
        .select()
        .from(memberTable)
        .where(
          and(eq(memberTable.id, memberId), eq(memberTable.guildId, guildId)),
        )
        .limit(1)
        .pipe(Effect.map((rows) => rows[0] ?? null)),
    );

  const findMemberNpcPage = (
    filter: KillStatsFilter,
    limit: number,
    cursor: number,
  ) => {
    const source = memberSource(filter);

    return protect(
      "kills.stats.member-page",
      readNpcKillPage(
        database,
        source,
        buildKillStatsCondition(memberColumns(source), filter),
        { limit, cursor, includeOverview: true },
      ),
    );
  };

  const topGuildNpcs = (filter: KillStatsFilter, limit: number) => {
    const source = guildSource(filter);

    const ranked = database
      .selectDistinctOn([source.npcId], {
        npcId: source.npcId,
        npcName: source.npcName,
        npcType: source.npcType,
        npcLvl: source.npcLvl,
        npcProf: source.npcProf,
        npcIcon: source.npcIcon,
        uniqueKills:
          sql<number>`sum(${source.kills}) over (partition by ${source.npcId})`
            .mapWith(Number)
            .as("uniqueKills"),
      })
      .from(source)
      .where(buildKillStatsCondition(guildColumns(source), filter))
      .orderBy(source.npcId, desc(source.npcLvl), desc(source.lastKilledAt))
      .as("ranked");

    const query = database
      .select()
      .from(ranked)
      .orderBy(desc(ranked.uniqueKills), ranked.npcId);

    const sqlLimit = Math.trunc(limit);

    return protect(
      "kills.stats.top-npcs",
      Number.isSafeInteger(sqlLimit) && sqlLimit >= 0
        ? query.limit(sqlLimit)
        : query.pipe(Effect.map((rows) => rows.slice(0, limit))),
    );
  };

  const topMembersByType = (filter: KillStatsFilter, limit: number) => {
    const source = memberSource(filter);

    const grouped = database
      .select({
        npcType: source.npcType,
        memberId: source.memberId,
        memberName: memberTable.name,
        memberAvatar: memberTable.avatar,
        memberUserId: memberTable.userId,
        totalParticipations: sum(source.kills)
          .mapWith(Number)
          .as("totalParticipations"),
        rank: sql<number>`row_number() over (partition by ${source.npcType} order by sum(${source.kills}) desc, ${source.memberId})`.as(
          "rank",
        ),
      })
      .from(source)
      .innerJoin(memberTable, eq(memberTable.id, source.memberId))
      .where(buildKillStatsCondition(memberColumns(source), filter))
      .groupBy(source.npcType, source.memberId, memberTable.id)
      .as("ranked");

    const sqlLimit = Math.trunc(limit);

    return protect(
      "kills.stats.top-members",
      database
        .select()
        .from(grouped)
        .where(
          Number.isSafeInteger(sqlLimit) && sqlLimit >= 0
            ? lte(grouped.rank, sqlLimit)
            : undefined,
        )
        .orderBy(grouped.npcType, grouped.rank),
    );
  };

  const topNpcKillers = (filter: KillStatsFilter, limit: number) => {
    const source = memberSource(filter);
    const participationCount = sum(source.kills).mapWith(Number);

    return protect(
      "kills.stats.npc-killers",
      database
        .select({
          memberId: source.memberId,
          memberName: memberTable.name,
          memberAvatar: memberTable.avatar,
          memberUserId: memberTable.userId,
          participationCount,
          totalMemberParticipations:
            sql<number>`sum(sum(${source.kills})) over ()`.mapWith(Number),
        })
        .from(source)
        .innerJoin(memberTable, eq(memberTable.id, source.memberId))
        .where(buildKillStatsCondition(memberColumns(source), filter))
        .groupBy(source.memberId, memberTable.id)
        .orderBy(desc(participationCount), source.memberId)
        .limit(limit),
    );
  };

  const findMemberNpcMetadata = (filter: KillStatsFilter) => {
    const source = memberSource(filter);

    return protect(
      "kills.stats.npc-metadata",
      database
        .select({
          npcId: source.npcId,
          npcName: source.npcName,
          npcType: source.npcType,
          npcLvl: source.npcLvl,
          npcProf: source.npcProf,
          npcIcon: source.npcIcon,
        })
        .from(source)
        .innerJoin(memberTable, eq(memberTable.id, source.memberId))
        .where(buildKillStatsCondition(memberColumns(source), filter))
        .orderBy(desc(source.npcLvl), desc(source.lastKilledAt))
        .limit(1)
        .pipe(Effect.map((rows) => rows[0] ?? null)),
    );
  };

  const groupMemberStats = (filter: KillStatsFilter) => {
    const source = memberSource(filter);

    return protect(
      "kills.stats.member-groups",
      database
        .select({
          memberId: source.memberId,
          npcType: source.npcType,
          memberKills: sum(source.kills).mapWith(Number),
        })
        .from(source)
        .where(buildKillStatsCondition(memberColumns(source), filter))
        .groupBy(source.memberId, source.npcType)
        .pipe(
          Effect.map((rows) =>
            rows.map((row) => ({
              memberId: row.memberId,
              npcType: row.npcType,
              _sum: { memberKills: row.memberKills },
            })),
          ),
        ),
    );
  };

  const groupGuildSummaries = (filter: KillStatsFilter) => {
    const source = guildSource(filter);

    return protect(
      "kills.stats.guild-groups",
      database
        .select({
          npcType: source.npcType,
          uniqueKills: sum(source.kills).mapWith(Number),
        })
        .from(source)
        .where(buildKillStatsCondition(guildColumns(source), filter))
        .groupBy(source.npcType)
        .pipe(
          Effect.map((rows) =>
            rows.map((row) => ({
              npcType: row.npcType,
              _sum: { uniqueKills: row.uniqueKills },
            })),
          ),
        ),
    );
  };

  return {
    topGuildNpcs,
    topMembersByType,
    topNpcKillers,
    findMemberNpcMetadata,
    findMembers,
    findMember,
    findMemberNpcPage,
    groupMemberStats,
    groupGuildSummaries,
  } as const;
};

export type KillStatsPersistence = ReturnType<typeof makeKillStatsPersistence>;
