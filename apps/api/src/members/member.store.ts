import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { isEqual, pickBy } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { findActiveGuild } from "#src/guilds/active-guild-lookup";
import {
  memberSyncDeliveryTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";

type MemberWrite = {
  readonly avatar: string | null;
  readonly banner: string | null;
  readonly name: string;
  readonly active: boolean;
  readonly globalUserId: string;
  readonly lastDiscordAttemptAt: Date;
  readonly lastDiscordSyncAt: Date;
  readonly lastDiscordStatus: string;
};

class MemberStoreFailure extends TaggedErrorClass<MemberStoreFailure>()(
  "MemberStoreFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeMemberStore = (database: ApiDatabaseValue) => {
  const operation = <A>(name: string, effect: Effect.Effect<A, unknown>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new MemberStoreFailure({ operation: name, cause }),
      ),
      Effect.withSpan(name, {
        attributes: { adapter: "api.database", retryCount: 0 },
      }),
    );

  const findMember = (userId: string, guildId: string) =>
    operation(
      "memberStore.find",
      database
        .select()
        .from(memberTable)
        .where(
          and(eq(memberTable.userId, userId), eq(memberTable.guildId, guildId)),
        )
        .limit(1)
        .pipe(Effect.map((rows) => rows[0] ?? null)),
    );

  const attachRoles = (member: typeof memberTable.$inferSelect) =>
    operation(
      "memberStore.roles",
      database
        .select({ role: roleTable })
        .from(memberToRoleTable)
        .innerJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
        .where(eq(memberToRoleTable.A, member.id))
        .orderBy(desc(roleTable.position))
        .pipe(
          Effect.map((rows) => ({
            ...member,
            roles: rows.map(({ role }) => role),
          })),
        ),
    );

  const findMemberWithRoles = (userId: string, guildId: string) =>
    findMember(userId, guildId).pipe(
      Effect.flatMap((member) =>
        member ? attachRoles(member) : Effect.succeed(null),
      ),
    );

  const resolveActiveGuildId = (idOrVanityUrl: string) =>
    operation(
      "memberStore.resolveGuild",
      findActiveGuild(database, idOrVanityUrl).pipe(
        Effect.map((guild) => guild?.id ?? null),
      ),
    );

  type Transaction = Parameters<
    Parameters<ApiDatabaseValue["transaction"]>[0]
  >[0];

  const queueDelivery = (
    transaction: Transaction,
    memberId: number,
    permissionsChanged: boolean,
  ) =>
    transaction
      .insert(memberSyncDeliveryTable)
      .values({ memberId, permissionsChanged })
      .onConflictDoUpdate({
        target: memberSyncDeliveryTable.memberId,
        set: {
          permissionsChanged: sql`${memberSyncDeliveryTable.permissionsChanged} or ${permissionsChanged}`,
        },
      });

  const upsertMemberWithRoles = (
    userId: string,
    guildId: string,
    values: MemberWrite,
    roleIds: ReadonlyArray<string>,
  ) =>
    operation(
      "memberStore.upsert.transaction",
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const lookup = () =>
            transaction
              .select()
              .from(memberTable)
              .where(
                and(
                  eq(memberTable.userId, userId),
                  eq(memberTable.guildId, guildId),
                ),
              )
              .for("update");

          let [existing] = yield* lookup();
          let created = false;

          if (!existing) {
            const inserted = yield* transaction
              .insert(memberTable)
              .values({
                userId,
                guildId,
                ...values,
                createdAt: values.lastDiscordSyncAt,
                updatedAt: values.lastDiscordSyncAt,
              })
              .onConflictDoNothing({
                target: [memberTable.userId, memberTable.guildId],
              })
              .returning();

            created = inserted.length > 0;
            [existing] = created ? inserted : yield* lookup();
          }

          if (!existing) return yield* Effect.die("Member was not returned");

          const roles =
            roleIds.length === 0
              ? []
              : yield* transaction
                  .select()
                  .from(roleTable)
                  .where(
                    and(
                      inArray(roleTable.id, [...roleIds]),
                      eq(roleTable.guildId, guildId),
                    ),
                  )
                  .orderBy(desc(roleTable.position));

          const currentRoles = yield* transaction
            .select({ id: memberToRoleTable.B })
            .from(memberToRoleTable)
            .where(eq(memberToRoleTable.A, existing.id));

          const currentIds = new Set(currentRoles.map(({ id }) => id));
          const desiredIds = new Set(roles.map(({ id }) => id));

          const removedIds = [...currentIds].filter(
            (id) => !desiredIds.has(id),
          );

          const addedIds = [...desiredIds].filter((id) => !currentIds.has(id));

          const permissionsChanged =
            created ||
            existing.active !== values.active ||
            existing.globalUserId !== values.globalUserId ||
            removedIds.length > 0 ||
            addedIds.length > 0;

          const readProjectionChanged =
            permissionsChanged ||
            existing.name !== values.name ||
            existing.avatar !== values.avatar;

          const changed =
            readProjectionChanged || existing.banner !== values.banner;

          let member = existing;

          const updates = pickBy(
            values,
            (value, key) => !isEqual(existing[key], value),
          );

          if (!created && (changed || Object.keys(updates).length > 0)) {
            const [updated] = yield* transaction
              .update(memberTable)
              .set({
                ...updates,
                ...(changed && { updatedAt: values.lastDiscordSyncAt }),
              })
              .where(eq(memberTable.id, existing.id))
              .returning();

            if (!updated) return yield* Effect.die("Member was not returned");
            member = updated;
          }

          if (removedIds.length > 0) {
            yield* transaction
              .delete(memberToRoleTable)
              .where(
                and(
                  eq(memberToRoleTable.A, member.id),
                  inArray(memberToRoleTable.B, removedIds),
                ),
              );
          }

          if (addedIds.length > 0) {
            yield* transaction
              .insert(memberToRoleTable)
              .values(addedIds.map((id) => ({ A: member.id, B: id })));
          }

          if (readProjectionChanged)
            yield* queueDelivery(transaction, member.id, permissionsChanged);

          return { ...member, roles };
        }),
      ),
    );

  const markSyncAttempt = (options: {
    readonly userId: string;
    readonly guildId: string;
    readonly status: string;
    readonly deactivate: boolean;
    readonly markSynced: boolean;
    readonly attemptedAt: Date;
  }) =>
    operation(
      "memberStore.markSync.transaction",
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const [existing] = yield* transaction
            .select()
            .from(memberTable)
            .where(
              and(
                eq(memberTable.userId, options.userId),
                eq(memberTable.guildId, options.guildId),
              ),
            )
            .for("update");

          if (!existing) return null;

          const currentRoles = yield* transaction
            .select({ role: roleTable })
            .from(memberToRoleTable)
            .innerJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
            .where(eq(memberToRoleTable.A, existing.id));

          const changed =
            options.deactivate && (existing.active || currentRoles.length > 0);

          const [member] = yield* transaction
            .update(memberTable)
            .set({
              lastDiscordAttemptAt: options.attemptedAt,
              ...(existing.lastDiscordStatus !== options.status && {
                lastDiscordStatus: options.status,
              }),
              ...(options.markSynced && {
                lastDiscordSyncAt: options.attemptedAt,
              }),
              ...(options.deactivate && existing.active && { active: false }),
              ...(changed && { updatedAt: options.attemptedAt }),
            })
            .where(eq(memberTable.id, existing.id))
            .returning();

          if (!member) return null;

          if (options.deactivate && currentRoles.length > 0) {
            yield* transaction
              .delete(memberToRoleTable)
              .where(eq(memberToRoleTable.A, member.id));
          }

          if (changed) yield* queueDelivery(transaction, member.id, true);

          return {
            ...member,
            roles: options.deactivate
              ? []
              : currentRoles.map(({ role }) => role),
          };
        }),
      ),
    );

  const deliverPendingChanges = (
    memberId: number,
    deliver: (
      member: typeof memberTable.$inferSelect,
      permissionsChanged: boolean,
    ) => Effect.Effect<unknown, unknown>,
    skipLocked = false,
  ) =>
    operation(
      "memberStore.deliverPendingChanges",
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const [pending] = yield* transaction
            .select()
            .from(memberSyncDeliveryTable)
            .where(eq(memberSyncDeliveryTable.memberId, memberId))
            .for("update", skipLocked ? { skipLocked: true } : undefined);

          if (!pending) return;

          const [member] = yield* transaction
            .select()
            .from(memberTable)
            .where(eq(memberTable.id, memberId));

          if (member) yield* deliver(member, pending.permissionsChanged);
          yield* transaction
            .delete(memberSyncDeliveryTable)
            .where(eq(memberSyncDeliveryTable.memberId, memberId));
        }).pipe(Effect.timeout("10 seconds")),
      ),
    );

  const findPendingMemberIds = (afterMemberId: number) =>
    operation(
      "memberStore.pendingDeliveries",
      database
        .select({ memberId: memberSyncDeliveryTable.memberId })
        .from(memberSyncDeliveryTable)
        .where(gt(memberSyncDeliveryTable.memberId, afterMemberId))
        .orderBy(asc(memberSyncDeliveryTable.memberId))
        .limit(25),
    );

  return {
    findPendingMemberIds,
    findMember,
    findMemberWithRoles,
    resolveActiveGuildId,
    upsertMemberWithRoles,
    markSyncAttempt,
    deliverPendingChanges,
  };
};

export type MemberStore = ReturnType<typeof makeMemberStore>;
