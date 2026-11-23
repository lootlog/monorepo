import { and, eq, isNull } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { guildTable } from "#src/database/drizzle/organization.schema";

export const operationalGuild = and(
  eq(guildTable.active, true),
  isNull(guildTable.suspendedAt),
);

export const isOperationalGuild = (guild: {
  readonly active: boolean;
  readonly suspendedAt: Date | null;
}) => guild.active && guild.suspendedAt === null;

export const isOrganizationOperational = (
  database: Pick<ApiDatabaseValue, "select">,
  guildId: string,
) =>
  database
    .select({ id: guildTable.id })
    .from(guildTable)
    .where(and(eq(guildTable.id, guildId), operationalGuild))
    .limit(1)
    .pipe(Effect.map((rows) => rows.length > 0));
