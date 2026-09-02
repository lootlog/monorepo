import { Injectable } from "@nestjs/common";
import { and, eq, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "../../database/drizzle/database.js";
import { DrizzleDatabaseRuntime } from "../../database/drizzle/runtime.js";
import { memberTable } from "../../database/drizzle/schema.js";

@Injectable()
export class MemberSyncRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  findStaleMembers(
    discordId: string,
    guildIds: ReadonlyArray<string>,
    staleThreshold: Date,
  ) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({
            userId: memberTable.userId,
            guildId: memberTable.guildId,
            globalUserId: memberTable.globalUserId,
          })
          .from(memberTable)
          .where(
            and(
              eq(memberTable.userId, discordId),
              inArray(memberTable.guildId, [...guildIds]),
              isNotNull(memberTable.globalUserId),
              eq(memberTable.active, true),
              or(
                isNull(memberTable.lastDiscordSyncAt),
                lt(memberTable.lastDiscordSyncAt, staleThreshold),
              ),
            ),
          ),
      ),
    );
  }
}
