import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  lootCommentTable,
  lootLikeTable,
  memberTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/schema";
import { PermissionDeniedError } from "#src/shared/http/http-errors";
import type {
  CreateLootCommentRequest,
  LootCommentResponse,
} from "#src/contracts/loots/schemas";
import type { MemberSummary } from "#src/contracts/shared";
import { ErrorKey } from "#src/loots/error-key";
import { memberDisplayRolesQuery } from "#src/members/member-display-role";
import { findActiveGuildMember } from "#src/members/member-access-query";

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
  ) => PersistenceEffect<ReadonlyArray<LootCommentResponse>>;
  readonly createComment: (options: {
    readonly discordId: string;
    readonly guildId: string;
    readonly lootId: number;
    readonly body: CreateLootCommentRequest;
  }) => PersistenceEffect<LootCommentResponse>;
  /** Likes or unlikes the loot as the caller; null when the record is gone. */
  readonly setLike: (options: {
    readonly discordId: string;
    readonly guildId: string;
    readonly lootId: number;
    readonly liked: boolean;
  }) => PersistenceEffect<ReadonlyArray<MemberSummary> | null>;
}

type Database = typeof ApiDatabase.Service;

export const makeLootPersistence = (database: Database): LootPersistence => {
  const protect = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError((cause): PersistenceFailure =>
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
          : yield* memberDisplayRolesQuery(database, memberIds);

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
          id: member.id,
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
            const actor = yield* findActiveGuildMember(
              transaction,
              options.discordId,
              options.guildId,
            );

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
            createdAt: comment.createdAt.toISOString(),
            updatedAt: comment.updatedAt.toISOString(),
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
                  new PermissionDeniedError({
                    code: ErrorKey.CANT_CREATE_COMMENT,
                  }),
                );
              }

              const member = yield* findActiveGuildMember(
                transaction,
                options.discordId,
                options.guildId,
              );

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
            createdAt: comment.createdAt.toISOString(),
            updatedAt: comment.updatedAt.toISOString(),
          };
        }),
      ),

    setLike: (options) =>
      protect(
        "loots.likes.set.transaction",
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

            if (!record) return null;

            const member = yield* findActiveGuildMember(
              transaction,
              options.discordId,
              options.guildId,
            );

            if (!member) {
              return yield* Effect.fail(
                new LootPersistenceError({
                  operation: "loots.likes.set.member",
                  cause: "member-missing",
                }),
              );
            }

            // Repeating a like or an unlike leaves the same state.
            if (options.liked) {
              yield* transaction
                .insert(lootLikeTable)
                .values({
                  organizationLootRecordId: record.id,
                  memberId: member.id,
                })
                .onConflictDoNothing();
            } else {
              yield* transaction
                .delete(lootLikeTable)
                .where(
                  and(
                    eq(lootLikeTable.organizationLootRecordId, record.id),
                    eq(lootLikeTable.memberId, member.id),
                  ),
                );
            }

            return yield* transaction
              .select({
                id: memberTable.id,
                name: memberTable.name,
                avatar: memberTable.avatar,
                userId: memberTable.userId,
              })
              .from(lootLikeTable)
              .innerJoin(
                memberTable,
                eq(memberTable.id, lootLikeTable.memberId),
              )
              .where(eq(lootLikeTable.organizationLootRecordId, record.id))
              .orderBy(
                asc(lootLikeTable.createdAt),
                asc(lootLikeTable.memberId),
              );
          }),
        ),
      ),
  };
};
