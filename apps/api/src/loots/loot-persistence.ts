import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  lootCommentTable,
  memberTable,
  memberToRoleTable,
  organizationLootRecordTable,
  roleTable,
} from "#src/database/drizzle/schema";
import { PermissionDeniedError } from "#src/shared/http/http-errors";
import type { CreateCommentDto } from "#src/http-api/contracts/loots/schemas";
import { ErrorKey } from "#src/loots/error-key";

export class LootPersistenceError extends TaggedErrorClass<LootPersistenceError>()(
  "LootPersistenceError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

type PersistenceFailure = PermissionDeniedError | LootPersistenceError;
type PersistenceEffect<A> = Effect.Effect<A, PersistenceFailure>;

export interface LootPersistence {
  readonly archive: (options: {
    readonly discordId: string;
    readonly guildId: string;
    readonly lootId: number;
    readonly archivedAt: Date;
  }) => PersistenceEffect<boolean>;
  readonly listComments: (
    guildId: string,
    lootId: number,
  ) => PersistenceEffect<ReadonlyArray<unknown>>;
  readonly createComment: (options: {
    readonly discordId: string;
    readonly guildId: string;
    readonly lootId: number;
    readonly body: CreateCommentDto;
  }) => PersistenceEffect<unknown>;
}

type Database = typeof ApiDatabase.Service;

export const makeLootPersistence = (database: Database): LootPersistence => {
  const protect = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError(
        (cause): PersistenceFailure =>
          cause instanceof PermissionDeniedError
            ? cause
            : new LootPersistenceError({ operation, cause }),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "loots.drizzle", retryCount: 0 },
      }),
    );

  const attachMembers = (
    rows: ReadonlyArray<{
      readonly comment: typeof lootCommentTable.$inferSelect;
      readonly member: typeof memberTable.$inferSelect;
    }>,
  ) =>
    Effect.gen(function* () {
      const memberIds = [...new Set(rows.map(({ member }) => member.id))];
      const roles =
        memberIds.length === 0
          ? []
          : yield* database
              .select({
                memberId: memberToRoleTable.A,
                color: roleTable.color,
              })
              .from(memberToRoleTable)
              .innerJoin(roleTable, eq(roleTable.id, memberToRoleTable.B))
              .where(inArray(memberToRoleTable.A, memberIds))
              .orderBy(desc(roleTable.position));
      const rolesByMember = new Map<
        number,
        Array<{ readonly color: number | null }>
      >();
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
    });

  return {
    archive: (options) =>
      protect(
        "loots.archive.transaction",
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

    listComments: (guildId, lootId) =>
      protect(
        "loots.comments.list",
        Effect.gen(function* () {
          const rows = yield* database
            .select({ comment: lootCommentTable, member: memberTable })
            .from(lootCommentTable)
            .innerJoin(
              organizationLootRecordTable,
              eq(
                organizationLootRecordTable.id,
                lootCommentTable.organizationLootRecordId,
              ),
            )
            .innerJoin(
              memberTable,
              eq(memberTable.id, lootCommentTable.memberId),
            )
            .where(
              and(
                eq(organizationLootRecordTable.guildId, guildId),
                eq(organizationLootRecordTable.lootId, lootId),
                isNull(organizationLootRecordTable.archivedAt),
              ),
            )
            .orderBy(desc(lootCommentTable.createdAt));
          const comments = yield* attachMembers(rows);
          return comments.map((comment) => ({
            id: comment.id,
            lootId,
            guildId,
            content: comment.content,
            member: comment.member,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
          }));
        }),
      ),

    createComment: (options) =>
      protect(
        "loots.comments.create.transaction",
        Effect.gen(function* () {
          const created = yield* database.transaction((transaction) =>
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
              if (!record) {
                return yield* Effect.fail(
                  new PermissionDeniedError(ErrorKey.CANT_CREATE_COMMENT),
                );
              }
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
              if (!member) {
                return yield* Effect.fail(
                  new LootPersistenceError({
                    operation: "loots.comments.create.member",
                    cause: "member-missing",
                  }),
                );
              }
              const comments = yield* transaction
                .insert(lootCommentTable)
                .values({
                  organizationLootRecordId: record.id,
                  memberId: member.id,
                  content: options.body.content,
                  updatedAt: new Date(yield* Clock.currentTimeMillis),
                })
                .returning();
              const comment = comments[0];
              if (!comment) {
                return yield* Effect.fail(
                  new LootPersistenceError({
                    operation: "loots.comments.create.insert",
                    cause: "insert-failed",
                  }),
                );
              }
              return { comment, member };
            }),
          );
          const comments = yield* attachMembers([created]);
          const comment = comments[0];
          if (!comment) {
            return yield* Effect.fail(
              new LootPersistenceError({
                operation: "loots.comments.create.projection",
                cause: "projection-missing",
              }),
            );
          }
          return {
            id: comment.id,
            lootId: options.lootId,
            guildId: options.guildId,
            content: comment.content,
            member: comment.member,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
          };
        }),
      ),
  };
};
