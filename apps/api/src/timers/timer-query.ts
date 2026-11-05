import { eq } from "drizzle-orm";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { memberTable } from "#src/database/drizzle/organization.schema";
import { playerSnapshotTable } from "#src/database/drizzle/loot.schema";
import { timerTable } from "#src/database/drizzle/timer.schema";

export const selectTimersWithActors = (database: ApiDatabaseValue) =>
  database
    .select({
      timer: timerTable,
      member: memberTable,
      actorCharacter: playerSnapshotTable,
    })
    .from(timerTable)
    .leftJoin(memberTable, eq(memberTable.id, timerTable.createdById))
    .leftJoin(
      playerSnapshotTable,
      eq(playerSnapshotTable.id, timerTable.actorCharacterSnapshotId),
    );
