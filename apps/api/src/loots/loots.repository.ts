import { and, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  lootCommentTable,
  memberTable,
  memberToRoleTable,
  organizationLootRecordTable,
  roleTable,
} from "#src/database/drizzle/schema";

const bindQuery = (
  statement: string,
  parameters: ReadonlyArray<unknown>,
): SQL => {
  const chunks = statement.split(/(\$\d+)/u).map((chunk) => {
    const placeholder = /^\$(\d+)$/u.exec(chunk);
    if (!placeholder) return sql.raw(chunk);
    const index = Number(placeholder[1]) - 1;
    return sql`${parameters[index]}`;
  });
  return sql.join(chunks);
};

export class LootsRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async queryRaw<Rows extends ReadonlyArray<Record<string, unknown>>>(
    statement: string,
    parameters: ReadonlyArray<unknown>,
  ): Promise<Rows> {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.execute<Rows[number]>(bindQuery(statement, parameters)),
      ),
    );
    return rows as unknown as Rows;
  }

  archive(options: {
    discordId: string;
    guildId: string;
    lootId: number;
    archivedAt: Date;
  }) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            const actors = yield* transaction
              .select({ id: memberTable.id })
              .from(memberTable)
              .where(
                and(
                  eq(memberTable.userId, options.discordId),
                  eq(memberTable.guildId, options.guildId),
                ),
              )
              .limit(1);
            const actor = actors[0];
            if (!actor) return false;

            const archived = yield* transaction
              .update(organizationLootRecordTable)
              .set({
                archivedAt: options.archivedAt,
                archivedByMemberId: actor.id,
                updatedAt: options.archivedAt,
              })
              .where(
                and(
                  eq(organizationLootRecordTable.guildId, options.guildId),
                  eq(organizationLootRecordTable.lootId, options.lootId),
                  isNull(organizationLootRecordTable.archivedAt),
                ),
              )
              .returning({ id: organizationLootRecordTable.id });
            return archived.length > 0;
          }),
        ),
      ),
    );
  }

  async findComments(guildId: string, lootId: number) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ comment: lootCommentTable, member: memberTable })
          .from(lootCommentTable)
          .innerJoin(
            organizationLootRecordTable,
            eq(
              organizationLootRecordTable.id,
              lootCommentTable.organizationLootRecordId,
            ),
          )
          .innerJoin(memberTable, eq(memberTable.id, lootCommentTable.memberId))
          .where(
            and(
              eq(organizationLootRecordTable.guildId, guildId),
              eq(organizationLootRecordTable.lootId, lootId),
              isNull(organizationLootRecordTable.archivedAt),
            ),
          )
          .orderBy(desc(lootCommentTable.createdAt)),
      ),
    );
    return this.attachCommentMembers(rows);
  }

  async createComment(options: {
    discordId: string;
    guildId: string;
    lootId: number;
    content: string;
  }) {
    const result = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            const records = yield* transaction
              .select({ id: organizationLootRecordTable.id })
              .from(organizationLootRecordTable)
              .where(
                and(
                  eq(organizationLootRecordTable.guildId, options.guildId),
                  eq(organizationLootRecordTable.lootId, options.lootId),
                  isNull(organizationLootRecordTable.archivedAt),
                ),
              )
              .limit(1);
            const record = records[0];
            if (!record) return { kind: "loot-missing" } as const;

            const members = yield* transaction
              .select()
              .from(memberTable)
              .where(
                and(
                  eq(memberTable.userId, options.discordId),
                  eq(memberTable.guildId, options.guildId),
                ),
              )
              .limit(1);
            const member = members[0];
            if (!member) return { kind: "member-missing" } as const;

            const comments = yield* transaction
              .insert(lootCommentTable)
              .values({
                organizationLootRecordId: record.id,
                memberId: member.id,
                content: options.content,
                updatedAt: new Date(),
              })
              .returning();
            const comment = comments[0];
            if (!comment) return { kind: "insert-failed" } as const;
            return { kind: "created", comment, member } as const;
          }),
        ),
      ),
    );
    if (result.kind !== "created") return result;
    const [created] = await this.attachCommentMembers([
      { comment: result.comment, member: result.member },
    ]);
    return created
      ? ({ kind: "created", value: created } as const)
      : ({ kind: "insert-failed" } as const);
  }

  private async attachCommentMembers(
    rows: ReadonlyArray<{
      comment: typeof lootCommentTable.$inferSelect;
      member: typeof memberTable.$inferSelect;
    }>,
  ) {
    const memberIds = [...new Set(rows.map(({ member }) => member.id))];
    const roles =
      memberIds.length === 0
        ? []
        : await this.databaseRuntime.runPromise(
            Effect.flatMap(ApiDatabase, (database) =>
              database
                .select({
                  memberId: memberToRoleTable.A,
                  color: roleTable.color,
                })
                .from(memberToRoleTable)
                .innerJoin(roleTable, eq(roleTable.id, memberToRoleTable.B))
                .where(inArray(memberToRoleTable.A, memberIds))
                .orderBy(desc(roleTable.position)),
            ),
          );
    const rolesByMember = new Map<number, Array<{ color: number | null }>>();
    for (const role of roles) {
      const memberRoles = rolesByMember.get(role.memberId) ?? [];
      memberRoles.push({ color: role.color });
      rolesByMember.set(role.memberId, memberRoles);
    }
    return rows.map(({ comment, member }) => ({
      ...comment,
      member: {
        name: member.name,
        avatar: member.avatar,
        userId: member.userId,
        roles: rolesByMember.get(member.id) ?? [],
      },
    }));
  }
}
