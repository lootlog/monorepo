import { desc, sql, type SQL } from "drizzle-orm";
import { Effect } from "effect";
import type { MargonemAccountVerifiedV1 } from "@lootlog/protocol/rabbit/events";
import type { ApiDatabaseValue as Database } from "#src/database/drizzle/database";
import { userMargonemAccountTable } from "#src/database/drizzle/user.schema";

/** Records the gateway's fact; a late or repeated one never moves time back. */
export const recordMargonemAccountVerification = (
  database: Database,
  event: MargonemAccountVerifiedV1,
) =>
  database
    .insert(userMargonemAccountTable)
    .values({
      userId: event.userId,
      accountId: event.accountId,
      verifiedAt: new Date(event.verifiedAt),
    })
    .onConflictDoUpdate({
      target: [
        userMargonemAccountTable.userId,
        userMargonemAccountTable.accountId,
      ],
      set: {
        verifiedAt: sql`GREATEST(${userMargonemAccountTable.verifiedAt}, excluded."verifiedAt")`,
      },
    })
    .pipe(Effect.asVoid);

/** Each verified Margonem account with the User who proved it last. */
export const currentMargonemAccountPlayers = (
  database: Database,
  where?: SQL,
) =>
  database
    .selectDistinctOn([userMargonemAccountTable.accountId], {
      accountId: userMargonemAccountTable.accountId,
      userId: userMargonemAccountTable.userId,
    })
    .from(userMargonemAccountTable)
    .where(where)
    .orderBy(
      userMargonemAccountTable.accountId,
      desc(userMargonemAccountTable.verifiedAt),
    )
    .as("currentMargonemAccountPlayers");
