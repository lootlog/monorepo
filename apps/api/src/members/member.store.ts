import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { Effect, Schema } from "effect";
import { chunk, isEqual, pickBy } from "es-toolkit";
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

type Transaction = Parameters<
  Parameters<ApiDatabaseValue["transaction"]>[0]
>[0];

/**
 * Queues delivery of member changes in the transaction that commits them. A
 * change queued while an older one is being delivered bumps `version`, so the
 * in-flight delivery cannot delete it.
 */
export const queueMemberDeliveries = (
  transaction: Transaction,
  memberIds: ReadonlyArray<number>,
  permissionsChanged: boolean,
) =>
  Effect.forEach(
    // Sorted ids take row locks in one order across concurrent writers.
    chunk(
      memberIds.toSorted((left, right) => left - right),
      1000,
    ),
    (batch) =>
      transaction
        .insert(memberSyncDeliveryTable)
        .values(batch.map((memberId) => ({ memberId, permissionsChanged })))
        .onConflictDoUpdate({
          target: memberSyncDeliveryTable.memberId,
          set: {
            permissionsChanged: sql`${memberSyncDeliveryTable.permissionsChanged} or ${permissionsChanged}`,
            version: sql`${memberSyncDeliveryTable.version} + 1`,
          },
        }),
    { discard: true },
  );

// Longer than the delivery timeout, so an expired lease means the claimant died.
const DELIVERY_LEASE = "30 seconds";

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
            yield* queueMemberDeliveries(
              transaction,
              [member.id],
              permissionsChanged,
            );

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

          if (changed)
            yield* queueMemberDeliveries(transaction, [member.id], true);

          return {
            ...member,
            roles: options.deactivate
              ? []
              : currentRoles.map(({ role }) => role),
          };
        }),
      ),
    );

  const unclaimed = or(
    isNull(memberSyncDeliveryTable.claimedUntil),
    lte(memberSyncDeliveryTable.claimedUntil, sql`now()`),
  );

  /**
   * Leases one pending delivery in a single autocommitted statement, so no
   * transaction or row lock is held while the caller talks to Redis/RabbitMQ.
   */
  const claimDelivery = (memberId: number) =>
    operation(
      "memberStore.claimDelivery",
      Effect.gen(function* () {
        const [claim] = yield* database
          .update(memberSyncDeliveryTable)
          .set({
            claimedUntil: sql`now() + ${DELIVERY_LEASE}::interval`,
          })
          .where(and(eq(memberSyncDeliveryTable.memberId, memberId), unclaimed))
          .returning();

        if (!claim?.claimedUntil) return null;

        const [member] = yield* database
          .select()
          .from(memberTable)
          .where(eq(memberTable.id, memberId));

        return {
          memberId,
          version: claim.version,
          claimedUntil: claim.claimedUntil,
          permissionsChanged: claim.permissionsChanged,
          member: member ?? null,
        };
      }),
    );

  type DeliveryClaim = {
    readonly memberId: number;
    readonly version: number;
    readonly claimedUntil: Date;
  };

  const ownClaim = (claim: DeliveryClaim) =>
    and(
      eq(memberSyncDeliveryTable.memberId, claim.memberId),
      eq(memberSyncDeliveryTable.claimedUntil, claim.claimedUntil),
    );

  /** Makes a claimed delivery available to the next attempt. */
  const releaseDelivery = (claim: DeliveryClaim) =>
    operation(
      "memberStore.releaseDelivery",
      database
        .update(memberSyncDeliveryTable)
        .set({ claimedUntil: null })
        .where(ownClaim(claim)),
    );

  /**
   * Deletes the delivered version. Returns false and releases the claim when a
   * newer change was queued during delivery, which then needs its own delivery.
   */
  const completeDelivery = (claim: DeliveryClaim) =>
    operation(
      "memberStore.completeDelivery",
      Effect.gen(function* () {
        const deleted = yield* database
          .delete(memberSyncDeliveryTable)
          .where(
            and(
              ownClaim(claim),
              eq(memberSyncDeliveryTable.version, claim.version),
            ),
          )
          .returning({ memberId: memberSyncDeliveryTable.memberId });

        if (deleted.length > 0) return true;

        yield* database
          .update(memberSyncDeliveryTable)
          .set({ claimedUntil: null })
          .where(ownClaim(claim));

        return false;
      }),
    );

  const findPendingMemberIds = (afterMemberId: number) =>
    operation(
      "memberStore.pendingDeliveries",
      database
        .select({ memberId: memberSyncDeliveryTable.memberId })
        .from(memberSyncDeliveryTable)
        .where(
          and(gt(memberSyncDeliveryTable.memberId, afterMemberId), unclaimed),
        )
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
    claimDelivery,
    releaseDelivery,
    completeDelivery,
  };
};

export type MemberStore = ReturnType<typeof makeMemberStore>;
