import { getTableColumns, gte } from "drizzle-orm";
import { QueryBuilder, type PgColumn, type PgTable } from "drizzle-orm/pg-core";
import { mapValues } from "es-toolkit";
import {
  guildKillBucketTable,
  guildKillTotalTable,
  memberKillBucketTable,
  memberKillTotalTable,
  userKillBucketTable,
  userKillTotalTable,
} from "#src/database/drizzle/schema";

const query = new QueryBuilder();

/** The lifetime total columns named like the bucket `fields`. */
const totalFields = <Fields extends Record<string, PgColumn>>(
  fields: Fields,
  total: PgTable,
) => {
  const columns: Record<string, PgColumn> = getTableColumns(total);

  // SAFETY: every bucket column except periodStart exists in its total table
  // under the same name and type (see schema.ts).
  return mapValues(fields, (_column, name) => columns[name]) as Fields;
};

/**
 * Kill rows since `periodStart` (hourly buckets), or lifetime rows (one total
 * per key), with the same columns.
 */
export const userKillSource = (periodStart?: Date) => {
  const { periodStart: start, ...fields } =
    getTableColumns(userKillBucketTable);

  return periodStart
    ? query
        .select(fields)
        .from(userKillBucketTable)
        .where(gte(start, periodStart))
        .as("kills")
    : query
        .select(totalFields(fields, userKillTotalTable))
        .from(userKillTotalTable)
        .as("kills");
};

export const memberKillSource = (periodStart?: Date) => {
  const { periodStart: start, ...fields } = getTableColumns(
    memberKillBucketTable,
  );

  return periodStart
    ? query
        .select(fields)
        .from(memberKillBucketTable)
        .where(gte(start, periodStart))
        .as("kills")
    : query
        .select(totalFields(fields, memberKillTotalTable))
        .from(memberKillTotalTable)
        .as("kills");
};

export const guildKillSource = (periodStart?: Date) => {
  const { periodStart: start, ...fields } =
    getTableColumns(guildKillBucketTable);

  return periodStart
    ? query
        .select(fields)
        .from(guildKillBucketTable)
        .where(gte(start, periodStart))
        .as("kills")
    : query
        .select(totalFields(fields, guildKillTotalTable))
        .from(guildKillTotalTable)
        .as("kills");
};

export type UserKillSource = ReturnType<typeof userKillSource>;

export type MemberKillSource = ReturnType<typeof memberKillSource>;

export type GuildKillSource = ReturnType<typeof guildKillSource>;
