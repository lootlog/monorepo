import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  and,
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
} from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildKillSummaryBucketTable,
  guildKillSummaryTable,
  memberTable,
  npcKillStatsBucketTable,
  npcKillStatsTable,
} from "#src/database/drizzle/schema";

type NpcType = (typeof npcKillStatsTable.npcType.enumValues)[number];

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
  readonly guildId?: AnyPgColumn;
  readonly userId?: AnyPgColumn;
  readonly memberId?: AnyPgColumn;
  readonly npcId?: AnyPgColumn;
  readonly world: AnyPgColumn;
  readonly npcType: AnyPgColumn;
  readonly npcLvl: AnyPgColumn;
  readonly periodStart?: AnyPgColumn;
  readonly npcName: AnyPgColumn;
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
  filter.periodStart?.gte && columns.periodStart
    ? gte(columns.periodStart, filter.periodStart.gte)
    : undefined,
  filter.npcName?.contains
    ? ilike(columns.npcName, `%${filter.npcName.contains}%`)
    : undefined,
];

const condition = (
  columns: FilterColumns,
  filter: KillStatsFilter,
): SQL | undefined =>
  and(
    ...scalarConditions(columns, filter),
    ...npcConditions(columns, filter),
    ...rangeConditions(columns, filter),
    filter.AND
      ? and(...filter.AND.map((entry) => condition(columns, entry)))
      : undefined,
    filter.OR
      ? or(...filter.OR.map((entry) => condition(columns, entry)))
      : undefined,
  );

const memberColumns = (bucket: boolean): FilterColumns => {
  const table = bucket ? npcKillStatsBucketTable : npcKillStatsTable;
  return {
    guildId: table.guildId,
    userId: table.userId,
    memberId: table.memberId,
    npcId: table.npcId,
    world: table.world,
    npcType: table.npcType,
    npcLvl: table.npcLvl,
    periodStart: bucket ? npcKillStatsBucketTable.periodStart : undefined,
    npcName: table.npcName,
  };
};

const guildColumns = (bucket: boolean): FilterColumns => {
  const table = bucket ? guildKillSummaryBucketTable : guildKillSummaryTable;
  return {
    guildId: table.guildId,
    npcId: table.npcId,
    world: table.world,
    npcType: table.npcType,
    npcLvl: table.npcLvl,
    periodStart: bucket ? guildKillSummaryBucketTable.periodStart : undefined,
    npcName: table.npcName,
  };
};

export class KillStatsPersistenceError extends TaggedErrorClass<KillStatsPersistenceError>()(
  "KillStatsPersistenceError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

type MemberStat =
  | typeof npcKillStatsTable.$inferSelect
  | typeof npcKillStatsBucketTable.$inferSelect;
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
      ? Effect.succeed([] as ReadonlyArray<MemberSummary>)
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

  function findMemberStats(
    filter: KillStatsFilter,
    bucket: boolean,
    includeMember: true,
  ): Effect.Effect<
    ReadonlyArray<MemberStat & { member: Member }>,
    KillStatsPersistenceError
  >;
  function findMemberStats(
    filter: KillStatsFilter,
    bucket: boolean,
    includeMember?: false,
  ): Effect.Effect<ReadonlyArray<MemberStat>, KillStatsPersistenceError>;
  function findMemberStats(
    filter: KillStatsFilter,
    bucket: boolean,
    includeMember = false,
  ): Effect.Effect<
    ReadonlyArray<MemberStat | (MemberStat & { member: Member })>,
    KillStatsPersistenceError
  > {
    if (bucket && includeMember) {
      return protect(
        "kills.stats.member-list",
        database
          .select({ stat: npcKillStatsBucketTable, member: memberTable })
          .from(npcKillStatsBucketTable)
          .innerJoin(
            memberTable,
            eq(memberTable.id, npcKillStatsBucketTable.memberId),
          )
          .where(condition(memberColumns(true), filter))
          .pipe(
            Effect.map((rows) =>
              rows.map(({ stat, member }) => ({ ...stat, member })),
            ),
          ),
      );
    }
    if (bucket) {
      return protect(
        "kills.stats.member-list",
        database
          .select()
          .from(npcKillStatsBucketTable)
          .where(condition(memberColumns(true), filter)),
      );
    }
    if (includeMember) {
      return protect(
        "kills.stats.member-list",
        database
          .select({ stat: npcKillStatsTable, member: memberTable })
          .from(npcKillStatsTable)
          .innerJoin(
            memberTable,
            eq(memberTable.id, npcKillStatsTable.memberId),
          )
          .where(condition(memberColumns(false), filter))
          .pipe(
            Effect.map((rows) =>
              rows.map(({ stat, member }) => ({ ...stat, member })),
            ),
          ),
      );
    }
    return protect(
      "kills.stats.member-list",
      database
        .select()
        .from(npcKillStatsTable)
        .where(condition(memberColumns(false), filter)),
    );
  }

  const findGuildSummaries = (filter: KillStatsFilter, bucket: boolean) =>
    protect(
      "kills.stats.guild-summaries",
      bucket
        ? database
            .select()
            .from(guildKillSummaryBucketTable)
            .where(condition(guildColumns(true), filter))
        : database
            .select()
            .from(guildKillSummaryTable)
            .where(condition(guildColumns(false), filter)),
    );

  const groupMemberStats = (filter: KillStatsFilter, bucket: boolean) => {
    const table = bucket ? npcKillStatsBucketTable : npcKillStatsTable;
    return protect(
      "kills.stats.member-groups",
      database
        .select({
          memberId: table.memberId,
          npcType: table.npcType,
          memberKills: sum(table.memberKills).mapWith(Number),
        })
        .from(table)
        .where(condition(memberColumns(bucket), filter))
        .groupBy(table.memberId, table.npcType)
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

  const groupGuildSummaries = (filter: KillStatsFilter, bucket: boolean) => {
    const table = bucket ? guildKillSummaryBucketTable : guildKillSummaryTable;
    return protect(
      "kills.stats.guild-groups",
      database
        .select({
          npcType: table.npcType,
          uniqueKills: sum(table.uniqueKills).mapWith(Number),
        })
        .from(table)
        .where(condition(guildColumns(bucket), filter))
        .groupBy(table.npcType)
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
    findMembers,
    findMember,
    findMemberStats,
    findGuildSummaries,
    groupMemberStats,
    groupGuildSummaries,
  } as const;
};

export type KillStatsPersistence = ReturnType<typeof makeKillStatsPersistence>;
