import { randomUUID } from "node:crypto";

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
  sql,
  sum,
  type SQL,
} from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  guildKillSummaryBucketTable,
  guildKillSummaryTable,
  memberTable,
  npcKillStatsBucketTable,
  npcKillStatsTable,
  userKillStatsBucketTable,
  userKillStatsTable,
} from "#src/database/drizzle/schema";

type NpcType = (typeof userKillStatsTable.npcType.enumValues)[number];

type KillInput = {
  userId: string;
  world: string;
  npcId: number;
  npcName: string;
  npcType: NpcType;
  npcLvl: number;
  npcProf: string | null;
  npcIcon: string | null;
  lastKilledAt: Date;
};

type GuildKillInput = KillInput & { guildId: string };
type MemberKillInput = GuildKillInput & { memberId: number };

export type KillStatsFilter = {
  guildId?: string;
  userId?: string;
  memberId?: number;
  npcId?: number;
  world?: string;
  npcType?:
    | NpcType
    | {
        in?: ReadonlyArray<NpcType>;
        not?: NpcType;
        notIn?: ReadonlyArray<NpcType>;
      };
  npcLvl?: { gte?: number; lte?: number };
  periodStart?: { gte?: Date };
  npcName?: { contains?: string; mode?: "insensitive" };
  AND?: ReadonlyArray<KillStatsFilter>;
  OR?: ReadonlyArray<KillStatsFilter>;
};

type FilterColumns = {
  guildId?: AnyPgColumn;
  userId?: AnyPgColumn;
  memberId?: AnyPgColumn;
  npcId?: AnyPgColumn;
  world: AnyPgColumn;
  npcType: AnyPgColumn;
  npcLvl: AnyPgColumn;
  periodStart?: AnyPgColumn;
  npcName: AnyPgColumn;
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
): Array<SQL | undefined> => {
  const conditions: Array<SQL | undefined> = [];
  if (typeof filter.npcType === "string") {
    conditions.push(eq(columns.npcType, filter.npcType));
  }
  if (typeof filter.npcType === "object") {
    if (filter.npcType.in) {
      conditions.push(inArray(columns.npcType, [...filter.npcType.in]));
    }
    if (filter.npcType.not) {
      conditions.push(ne(columns.npcType, filter.npcType.not));
    }
    if (filter.npcType.notIn) {
      conditions.push(notInArray(columns.npcType, [...filter.npcType.notIn]));
    }
  }
  return conditions;
};

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

const filterCondition = (
  columns: FilterColumns,
  filter: KillStatsFilter,
): SQL | undefined =>
  and(
    ...scalarConditions(columns, filter),
    ...npcConditions(columns, filter),
    ...rangeConditions(columns, filter),
    filter.AND
      ? and(...filter.AND.map((entry) => filterCondition(columns, entry)))
      : undefined,
    filter.OR
      ? or(...filter.OR.map((entry) => filterCondition(columns, entry)))
      : undefined,
  );

const userColumns = (bucket: boolean): FilterColumns => {
  const table = bucket ? userKillStatsBucketTable : userKillStatsTable;
  return {
    userId: table.userId,
    npcId: table.npcId,
    world: table.world,
    npcType: table.npcType,
    npcLvl: table.npcLvl,
    periodStart: bucket ? userKillStatsBucketTable.periodStart : undefined,
    npcName: table.npcName,
  };
};

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

export class KillsRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  incrementUser(input: KillInput) {
    const now = new Date();
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .insert(userKillStatsTable)
          .values({ id: randomUUID(), ...input, totalKills: 1, updatedAt: now })
          .onConflictDoUpdate({
            target: [
              userKillStatsTable.userId,
              userKillStatsTable.world,
              userKillStatsTable.npcId,
            ],
            set: {
              totalKills: sql`${userKillStatsTable.totalKills} + 1`,
              lastKilledAt: input.lastKilledAt,
              npcName: input.npcName,
              npcLvl: input.npcLvl,
              npcProf: input.npcProf,
              npcIcon: input.npcIcon,
              updatedAt: now,
            },
          }),
      ),
    );
  }

  incrementUserBucket(input: KillInput & { periodStart: Date }) {
    const now = new Date();
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .insert(userKillStatsBucketTable)
          .values({ id: randomUUID(), ...input, totalKills: 1, updatedAt: now })
          .onConflictDoUpdate({
            target: [
              userKillStatsBucketTable.userId,
              userKillStatsBucketTable.world,
              userKillStatsBucketTable.npcId,
              userKillStatsBucketTable.periodStart,
            ],
            set: {
              totalKills: sql`${userKillStatsBucketTable.totalKills} + 1`,
              lastKilledAt: input.lastKilledAt,
              npcName: input.npcName,
              npcLvl: input.npcLvl,
              npcProf: input.npcProf,
              npcIcon: input.npcIcon,
              updatedAt: now,
            },
          }),
      ),
    );
  }

  incrementMember(input: MemberKillInput) {
    const now = new Date();
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .insert(npcKillStatsTable)
          .values({
            id: randomUUID(),
            ...input,
            memberKills: 1,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [
              npcKillStatsTable.guildId,
              npcKillStatsTable.memberId,
              npcKillStatsTable.world,
              npcKillStatsTable.npcId,
            ],
            set: {
              memberKills: sql`${npcKillStatsTable.memberKills} + 1`,
              lastKilledAt: input.lastKilledAt,
              npcName: input.npcName,
              npcLvl: input.npcLvl,
              npcProf: input.npcProf,
              npcIcon: input.npcIcon,
              updatedAt: now,
            },
          }),
      ),
    );
  }

  incrementMemberBucket(input: MemberKillInput & { periodStart: Date }) {
    const now = new Date();
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .insert(npcKillStatsBucketTable)
          .values({
            id: randomUUID(),
            ...input,
            memberKills: 1,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [
              npcKillStatsBucketTable.guildId,
              npcKillStatsBucketTable.memberId,
              npcKillStatsBucketTable.world,
              npcKillStatsBucketTable.npcId,
              npcKillStatsBucketTable.periodStart,
            ],
            set: {
              memberKills: sql`${npcKillStatsBucketTable.memberKills} + 1`,
              lastKilledAt: input.lastKilledAt,
              npcName: input.npcName,
              npcLvl: input.npcLvl,
              npcProf: input.npcProf,
              npcIcon: input.npcIcon,
              updatedAt: now,
            },
          }),
      ),
    );
  }

  incrementGuild(input: GuildKillInput) {
    const { userId: _userId, ...values } = input;
    const now = new Date();
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .insert(guildKillSummaryTable)
          .values({
            id: randomUUID(),
            ...values,
            uniqueKills: 1,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [
              guildKillSummaryTable.guildId,
              guildKillSummaryTable.world,
              guildKillSummaryTable.npcId,
            ],
            set: {
              uniqueKills: sql`${guildKillSummaryTable.uniqueKills} + 1`,
              lastKilledAt: input.lastKilledAt,
              npcName: input.npcName,
              npcLvl: input.npcLvl,
              npcProf: input.npcProf,
              npcIcon: input.npcIcon,
              updatedAt: now,
            },
          }),
      ),
    );
  }

  incrementGuildBucket(input: GuildKillInput & { periodStart: Date }) {
    const { userId: _userId, ...values } = input;
    const now = new Date();
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .insert(guildKillSummaryBucketTable)
          .values({
            id: randomUUID(),
            ...values,
            uniqueKills: 1,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [
              guildKillSummaryBucketTable.guildId,
              guildKillSummaryBucketTable.world,
              guildKillSummaryBucketTable.npcId,
              guildKillSummaryBucketTable.periodStart,
            ],
            set: {
              uniqueKills: sql`${guildKillSummaryBucketTable.uniqueKills} + 1`,
              lastKilledAt: input.lastKilledAt,
              npcName: input.npcName,
              npcLvl: input.npcLvl,
              npcProf: input.npcProf,
              npcIcon: input.npcIcon,
              updatedAt: now,
            },
          }),
      ),
    );
  }

  findMembersByGuilds(userId: string, guildIds: ReadonlyArray<string>) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(memberTable)
          .where(
            and(
              eq(memberTable.userId, userId),
              inArray(memberTable.guildId, [...guildIds]),
            ),
          ),
      ),
    );
  }

  findMembers(memberIds: ReadonlyArray<number>) {
    if (memberIds.length === 0) return Promise.resolve([]);
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({
            id: memberTable.id,
            name: memberTable.name,
            avatar: memberTable.avatar,
            userId: memberTable.userId,
          })
          .from(memberTable)
          .where(inArray(memberTable.id, [...memberIds])),
      ),
    );
  }

  async findMember(guildId: string, memberId: number) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(memberTable)
          .where(
            and(eq(memberTable.id, memberId), eq(memberTable.guildId, guildId)),
          )
          .limit(1),
      ),
    );
    return rows[0] ?? null;
  }

  findUserStats(filter: KillStatsFilter, bucket: boolean) {
    const table = bucket ? userKillStatsBucketTable : userKillStatsTable;
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(table)
          .where(filterCondition(userColumns(bucket), filter)),
      ),
    );
  }

  findMemberStats(
    filter: KillStatsFilter,
    bucket: boolean,
  ): Promise<
    Array<
      | typeof npcKillStatsTable.$inferSelect
      | typeof npcKillStatsBucketTable.$inferSelect
    >
  >;
  findMemberStats(
    filter: KillStatsFilter,
    bucket: boolean,
    includeMember: true,
  ): Promise<
    Array<
      (
        | typeof npcKillStatsTable.$inferSelect
        | typeof npcKillStatsBucketTable.$inferSelect
      ) & { member: typeof memberTable.$inferSelect }
    >
  >;
  findMemberStats(
    filter: KillStatsFilter,
    bucket: boolean,
    includeMember = false,
  ) {
    const table = bucket ? npcKillStatsBucketTable : npcKillStatsTable;
    if (!includeMember) {
      return this.databaseRuntime.runPromise(
        Effect.flatMap(ApiDatabase, (database) =>
          database
            .select()
            .from(table)
            .where(filterCondition(memberColumns(bucket), filter)),
        ),
      );
    }
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ stat: table, member: memberTable })
          .from(table)
          .innerJoin(memberTable, eq(memberTable.id, table.memberId))
          .where(filterCondition(memberColumns(bucket), filter))
          .pipe(
            Effect.map((rows) =>
              rows.map(({ stat, member }) => ({ ...stat, member })),
            ),
          ),
      ),
    );
  }

  findGuildSummaries(filter: KillStatsFilter, bucket: boolean) {
    const table = bucket ? guildKillSummaryBucketTable : guildKillSummaryTable;
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(table)
          .where(filterCondition(guildColumns(bucket), filter)),
      ),
    );
  }

  groupMemberStats(filter: KillStatsFilter, bucket: boolean) {
    const table = bucket ? npcKillStatsBucketTable : npcKillStatsTable;
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({
            memberId: table.memberId,
            npcType: table.npcType,
            memberKills: sum(table.memberKills).mapWith(Number),
          })
          .from(table)
          .where(filterCondition(memberColumns(bucket), filter))
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
      ),
    );
  }

  groupGuildSummaries(filter: KillStatsFilter, bucket: boolean) {
    const table = bucket ? guildKillSummaryBucketTable : guildKillSummaryTable;
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({
            npcType: table.npcType,
            uniqueKills: sum(table.uniqueKills).mapWith(Number),
          })
          .from(table)
          .where(filterCondition(guildColumns(bucket), filter))
          .groupBy(table.npcType)
          .pipe(
            Effect.map((rows) =>
              rows.map((row) => ({
                npcType: row.npcType,
                _sum: { uniqueKills: row.uniqueKills },
              })),
            ),
          ),
      ),
    );
  }
}
