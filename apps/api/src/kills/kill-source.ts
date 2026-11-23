import { getTableColumns, gte } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import {
  guildKillBucketTable,
  guildKillTotalTable,
  memberKillBucketTable,
  memberKillTotalTable,
  userKillBucketTable,
  userKillTotalTable,
} from "#src/database/drizzle/kill-statistics.schema";

const query = new QueryBuilder();

const userKillBuckets = (periodStart: Date) => {
  const { periodStart: start, ...fields } =
    getTableColumns(userKillBucketTable);

  return query
    .select(fields)
    .from(userKillBucketTable)
    .where(gte(start, periodStart))
    .as("kills");
};

export type UserKillSource = ReturnType<typeof userKillBuckets>;

export const userKillSource = (periodStart?: Date): UserKillSource =>
  periodStart
    ? userKillBuckets(periodStart)
    : query
        .select(getTableColumns(userKillTotalTable))
        .from(userKillTotalTable)
        .as("kills");

const memberKillBuckets = (periodStart: Date) => {
  const { periodStart: start, ...fields } = getTableColumns(
    memberKillBucketTable,
  );

  return query
    .select(fields)
    .from(memberKillBucketTable)
    .where(gte(start, periodStart))
    .as("kills");
};

export type MemberKillSource = ReturnType<typeof memberKillBuckets>;

export const memberKillSource = (periodStart?: Date): MemberKillSource =>
  periodStart
    ? memberKillBuckets(periodStart)
    : query
        .select(getTableColumns(memberKillTotalTable))
        .from(memberKillTotalTable)
        .as("kills");

const guildKillBuckets = (periodStart: Date) => {
  const { periodStart: start, ...fields } =
    getTableColumns(guildKillBucketTable);

  return query
    .select(fields)
    .from(guildKillBucketTable)
    .where(gte(start, periodStart))
    .as("kills");
};

export type GuildKillSource = ReturnType<typeof guildKillBuckets>;

export const guildKillSource = (periodStart?: Date): GuildKillSource =>
  periodStart
    ? guildKillBuckets(periodStart)
    : query
        .select(getTableColumns(guildKillTotalTable))
        .from(guildKillTotalTable)
        .as("kills");
