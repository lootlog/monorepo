import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  lootCommentTable,
  lootDrawTable,
  lootLikeTable,
  type LootDrawEntrantRecord,
  memberTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/schema";
import {
  PermissionDeniedError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import type {
  CreateLootCommentRequest,
  LootCommentResponse,
  LootDrawResponse,
} from "#src/contracts/loots/schemas";
import type { MemberSummary } from "#src/contracts/shared";
import { ErrorKey } from "#src/loots/error-key";
import { memberDisplayRolesQuery } from "#src/members/member-display-role";
import { findActiveGuildMember } from "#src/members/member-access-query";

export class LootPersistenceError extends TaggedErrorClass<LootPersistenceError>()(
  "LootPersistenceError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

type PersistenceFailure =
  | PermissionDeniedError
  | ResourceConflictError
  | ResourceNotFoundError
  | LootPersistenceError;

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
  /** Draws of the loot's items, newest first; voided ones included. */
  readonly listDraws: (
    guildId: string,
    lootId: number,
  ) => PersistenceEffect<ReadonlyArray<LootDrawResponse>>;
  /**
   * Stores a drawn result for one item; fails with a conflict while the item
   * has a standing draw, so a retried request cannot add a second one.
   */
  readonly createDraw: (options: {
    readonly discordId: string;
    readonly guildId: string;
    readonly lootId: number;
    readonly itemHid: string;
    readonly entrants: ReadonlyArray<LootDrawEntrantRecord>;
    readonly ticketOrder: ReadonlyArray<number>;
    readonly roll: number;
    readonly winnerIndex: number;
  }) => PersistenceEffect<LootDrawResponse>;
  readonly voidDraw: (options: {
    readonly discordId: string;
    readonly guildId: string;
    readonly lootId: number;
    readonly drawId: number;
    readonly reason: string;
  }) => PersistenceEffect<LootDrawResponse>;
}

type Database = typeof ApiDatabase.Service;

export const makeLootPersistence = (database: Database): LootPersistence => {
  const protect = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError((cause): PersistenceFailure =>
        cause instanceof PermissionDeniedError ||
        cause instanceof ResourceConflictError ||
        cause instanceof ResourceNotFoundError
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

  const toMemberSummary = (member: typeof memberTable.$inferSelect) => ({
    id: member.id,
    name: member.name,
    avatar: member.avatar,
    userId: member.userId,
  });

  /** Draw rows with the Members who ran and voided them. */
  const projectDraws = (
    lootId: number,
    draws: ReadonlyArray<typeof lootDrawTable.$inferSelect>,
  ) =>
    Effect.gen(function* () {
      const memberIds = [
        ...new Set(
          draws.flatMap((draw) =>
            draw.voidedByMemberId === null
              ? [draw.createdByMemberId]
              : [draw.createdByMemberId, draw.voidedByMemberId],
          ),
        ),
      ];

      const members =
        memberIds.length === 0
          ? []
          : yield* database
              .select()
              .from(memberTable)
              .where(inArray(memberTable.id, memberIds));

      const membersById = new Map(
        members.map((member) => [member.id, toMemberSummary(member)]),
      );

      const memberOf = (id: number) => {
        const member = membersById.get(id);

        if (!member) {
          return Effect.fail(
            new LootPersistenceError({
              operation: "loots.draws.project.member",
              cause: "member-missing",
            }),
          );
        }

        return Effect.succeed(member);
      };

      return yield* Effect.forEach(draws, (draw) =>
        Effect.gen(function* () {
          const voided =
            draw.voidedAt !== null &&
            draw.voidedByMemberId !== null &&
            draw.voidReason !== null
              ? {
                  at: draw.voidedAt.toISOString(),
                  by: yield* memberOf(draw.voidedByMemberId),
                  reason: draw.voidReason,
                }
              : null;

          return {
            id: draw.id,
            lootId,
            itemHid: draw.itemHid,
            entrants: draw.entrants,
            ticketOrder: draw.ticketOrder,
            roll: draw.roll,
            winnerIndex: draw.winnerIndex,
            createdBy: yield* memberOf(draw.createdByMemberId),
            createdAt: draw.createdAt.toISOString(),
            voided,
          };
        }),
      );
    });

  const recordCondition = (guildId: string, lootId: number) =>
    and(
      eq(organizationLootRecordTable.guildId, guildId),
      eq(organizationLootRecordTable.lootId, lootId),
      isNull(organizationLootRecordTable.archivedAt),
    );

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

    listDraws: (guildId, lootId) =>
      protect(
        "loots.draws.list",
        Effect.gen(function* () {
          const rows = yield* database
            .select({ draw: lootDrawTable })
            .from(lootDrawTable)
            .innerJoin(
              organizationLootRecordTable,
              eq(
                organizationLootRecordTable.id,
                lootDrawTable.organizationLootRecordId,
              ),
            )
            .where(recordCondition(guildId, lootId))
            .orderBy(desc(lootDrawTable.createdAt), desc(lootDrawTable.id));

          return yield* projectDraws(
            lootId,
            rows.map(({ draw }) => draw),
          );
        }),
      ),

    createDraw: (options) =>
      protect(
        "loots.draws.create.transaction",
        Effect.gen(function* () {
          const draw = yield* database.transaction((transaction) =>
            Effect.gen(function* () {
              // The record lock serialises draws of one loot, so two managers
              // drawing the same item at once get one result and a conflict.
              const [record] = yield* transaction
                .select({ id: organizationLootRecordTable.id })
                .from(organizationLootRecordTable)
                .where(recordCondition(options.guildId, options.lootId))
                .limit(1)
                .for("update");

              if (!record)
                return yield* Effect.fail(new ResourceNotFoundError());

              const member = yield* findActiveGuildMember(
                transaction,
                options.discordId,
                options.guildId,
              );

              if (!member) {
                return yield* Effect.fail(
                  new PermissionDeniedError({ code: "MEMBER_NOT_FOUND" }),
                );
              }

              const [standing] = yield* transaction
                .select({ id: lootDrawTable.id })
                .from(lootDrawTable)
                .where(
                  and(
                    eq(lootDrawTable.organizationLootRecordId, record.id),
                    eq(lootDrawTable.itemHid, options.itemHid),
                    isNull(lootDrawTable.voidedAt),
                  ),
                )
                .limit(1);

              if (standing) {
                return yield* Effect.fail(
                  new ResourceConflictError({
                    code: ErrorKey.LOOT_DRAW_ALREADY_EXISTS,
                  }),
                );
              }

              const [created] = yield* transaction
                .insert(lootDrawTable)
                .values({
                  organizationLootRecordId: record.id,
                  itemHid: options.itemHid,
                  entrants: [...options.entrants],
                  ticketOrder: [...options.ticketOrder],
                  roll: options.roll,
                  winnerIndex: options.winnerIndex,
                  createdByMemberId: member.id,
                  createdAt: new Date(yield* Clock.currentTimeMillis),
                })
                .returning();

              if (!created) {
                return yield* Effect.fail(
                  new LootPersistenceError({
                    operation: "loots.draws.create.insert",
                    cause: "insert-failed",
                  }),
                );
              }

              return created;
            }),
          );

          const [projected] = yield* projectDraws(options.lootId, [draw]);

          if (!projected) {
            return yield* Effect.fail(
              new LootPersistenceError({
                operation: "loots.draws.create.projection",
                cause: "projection-missing",
              }),
            );
          }

          return projected;
        }),
      ),

    voidDraw: (options) =>
      protect(
        "loots.draws.void.transaction",
        Effect.gen(function* () {
          const draw = yield* database.transaction((transaction) =>
            Effect.gen(function* () {
              const [found] = yield* transaction
                .select({ draw: lootDrawTable })
                .from(lootDrawTable)
                .innerJoin(
                  organizationLootRecordTable,
                  eq(
                    organizationLootRecordTable.id,
                    lootDrawTable.organizationLootRecordId,
                  ),
                )
                .where(
                  and(
                    eq(lootDrawTable.id, options.drawId),
                    recordCondition(options.guildId, options.lootId),
                  ),
                )
                .limit(1)
                .for("update", { of: lootDrawTable });

              if (!found) {
                return yield* Effect.fail(
                  new ResourceNotFoundError({
                    code: ErrorKey.LOOT_DRAW_NOT_FOUND,
                  }),
                );
              }

              if (found.draw.voidedAt !== null) {
                return yield* Effect.fail(
                  new ResourceConflictError({
                    code: ErrorKey.LOOT_DRAW_ALREADY_VOIDED,
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
                  new PermissionDeniedError({ code: "MEMBER_NOT_FOUND" }),
                );
              }

              const [voided] = yield* transaction
                .update(lootDrawTable)
                .set({
                  voidedAt: new Date(yield* Clock.currentTimeMillis),
                  voidedByMemberId: member.id,
                  voidReason: options.reason,
                })
                .where(eq(lootDrawTable.id, found.draw.id))
                .returning();

              if (!voided) {
                return yield* Effect.fail(
                  new LootPersistenceError({
                    operation: "loots.draws.void.update",
                    cause: "update-failed",
                  }),
                );
              }

              return voided;
            }),
          );

          const [projected] = yield* projectDraws(options.lootId, [draw]);

          if (!projected) {
            return yield* Effect.fail(
              new LootPersistenceError({
                operation: "loots.draws.void.projection",
                cause: "projection-missing",
              }),
            );
          }

          return projected;
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
