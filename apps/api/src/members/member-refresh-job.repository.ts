import { and, desc, eq, gte, sql } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "../database/drizzle/database.js";
import { DrizzleDatabaseRuntime } from "../database/drizzle/runtime.js";
import { memberRefreshJobTable } from "../database/drizzle/schema.js";

type RefreshJobStatus =
  (typeof memberRefreshJobTable.status.enumValues)[number];

export class MemberRefreshJobRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async findRecent(guildId: string, createdAt: Date) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(memberRefreshJobTable)
        .where(
          and(
            eq(memberRefreshJobTable.guildId, guildId),
            gte(memberRefreshJobTable.createdAt, createdAt),
          ),
        )
        .orderBy(desc(memberRefreshJobTable.createdAt))
        .limit(1),
    );
    return rows[0] ?? null;
  }

  async findLatest(guildId: string) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(memberRefreshJobTable)
        .where(eq(memberRefreshJobTable.guildId, guildId))
        .orderBy(desc(memberRefreshJobTable.createdAt))
        .limit(1),
    );
    return rows[0] ?? null;
  }

  async findById(id: number, guildId?: string) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(memberRefreshJobTable)
        .where(
          guildId === undefined
            ? eq(memberRefreshJobTable.id, id)
            : and(
                eq(memberRefreshJobTable.id, id),
                eq(memberRefreshJobTable.guildId, guildId),
              ),
        )
        .limit(1),
    );
    return rows[0] ?? null;
  }

  async create(guildId: string, requestedBy: string, totalMembers: number) {
    const now = new Date();
    const rows = await this.run((database) =>
      database
        .insert(memberRefreshJobTable)
        .values({
          guildId,
          requestedBy,
          status: "PENDING",
          totalMembers,
          createdAt: now,
          updatedAt: now,
        })
        .returning(),
    );
    const job = rows[0];
    if (!job) throw new Error("Member refresh job was not returned");
    return job;
  }

  update(
    id: number,
    values: {
      readonly status?: RefreshJobStatus;
      readonly processedMembers?: number;
      readonly completedAt?: Date;
    },
  ) {
    return this.run((database) =>
      database
        .update(memberRefreshJobTable)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(memberRefreshJobTable.id, id)),
    );
  }

  incrementFailed(id: number) {
    return this.run((database) =>
      database
        .update(memberRefreshJobTable)
        .set({
          failedMembers: sql`${memberRefreshJobTable.failedMembers} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(memberRefreshJobTable.id, id)),
    );
  }

  private run<A, E>(
    query: (database: typeof ApiDatabase.Service) => Effect.Effect<A, E, never>,
  ) {
    return this.databaseRuntime.runPromise(Effect.flatMap(ApiDatabase, query));
  }
}
