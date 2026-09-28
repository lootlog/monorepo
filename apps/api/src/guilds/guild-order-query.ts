import { eq } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { userSettingsTable } from "#src/database/drizzle/schema";

export const readGuildOrderPreference = (
  database: ApiDatabaseValue,
  userId: string,
) =>
  database
    .select({ guildsOrder: userSettingsTable.guildsOrder })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId))
    .limit(1)
    .pipe(Effect.map((rows) => rows[0]?.guildsOrder ?? []));
