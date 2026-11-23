import type {
  OrganizationAuditDetails,
  OrganizationLimits,
  OrganizationOperatorAction,
} from "@lootlog/schema/admin-organizations";
import { and, eq } from "drizzle-orm";
import { Clock, Effect } from "effect";
import {
  guildTable,
  memberTable,
  organizationOperatorAuditTable,
} from "#src/database/drizzle/organization.schema";
import { getGuildCacheKey } from "#src/guilds/guild-configuration-cache";
import type { MemberDelivery } from "#src/members/member-delivery.operations";
import { queueMemberDeliveries } from "#src/members/member.repository";
import { getPermissionsCachePattern } from "#src/shared/cache";
import {
  activeMember,
  type Database,
  type OrganizationOperator,
  OrganizationOperatorError,
  OrganizationSyncCooldown,
  requireOrganization,
  type Transaction,
} from "./organization-operator.shared.js";

const POST_COMMIT_DELIVERY_TIMEOUT = "3 seconds";

export interface OrganizationOperatorPorts {
  readonly refreshDiscordSync: (
    guildId: string,
  ) => Effect.Effect<
    unknown,
    OrganizationSyncCooldown | OrganizationOperatorError
  >;
  readonly deliverMemberChanges: MemberDelivery["deliverAll"];
  readonly invalidateUserGuildPermissions: (
    discordId: string,
  ) => Effect.Effect<unknown, unknown>;
  readonly clearCachePattern: (
    pattern: string,
  ) => Effect.Effect<unknown, unknown>;
  readonly clearCacheKey: (key: string) => Effect.Effect<unknown, unknown>;
}

export const organizationChangeCommands = (
  database: Database,
  ports: OrganizationOperatorPorts,
) => {
  const audited = <E>(
    operator: OrganizationOperator & { readonly guildId: string },
    action: OrganizationOperatorAction,
    change: (
      transaction: Transaction,
      now: Date,
    ) => Effect.Effect<OrganizationAuditDetails | null, E>,
    options: { readonly accessChanged: boolean } = { accessChanged: false },
  ) =>
    Effect.gen(function* () {
      const now = new Date(yield* Clock.currentTimeMillis);

      const committed = yield* database.transaction((transaction) =>
        Effect.gen(function* () {
          const before = yield* requireOrganization(
            transaction,
            operator.guildId,
            true,
          );

          const details = yield* change(transaction, now);

          yield* transaction.insert(organizationOperatorAuditTable).values({
            guildId: operator.guildId,
            operatorUserId: operator.operatorUserId,
            operatorName: operator.operatorName,
            action,
            details,
            createdAt: now,
          });

          if (!options.accessChanged) return { before, memberIds: [] };

          const members = yield* transaction
            .select({ id: memberTable.id })
            .from(memberTable)
            .where(
              and(eq(memberTable.guildId, operator.guildId), activeMember),
            );

          const memberIds = members.map(({ id }) => id);

          yield* queueMemberDeliveries(transaction, memberIds, true);

          return { before, memberIds };
        }),
      );

      if (!options.accessChanged) return;

      yield* Effect.all(
        [
          ports.deliverMemberChanges(committed.memberIds),
          ports.invalidateUserGuildPermissions(committed.before.ownerId),
          ports.clearCachePattern(getPermissionsCachePattern(operator.guildId)),
          ports.clearCacheKey(getGuildCacheKey(operator.guildId)),
          committed.before.vanityUrl
            ? ports.clearCacheKey(getGuildCacheKey(committed.before.vanityUrl))
            : Effect.void,
        ],
        { concurrency: "unbounded", discard: true },
      ).pipe(
        Effect.timeout(POST_COMMIT_DELIVERY_TIMEOUT),
        Effect.catch((error) =>
          Effect.logWarning(
            "Organization access change committed; member delivery left to the background sweep",
            error,
          ),
        ),
      );
    });

  const setLimits = Effect.fn("organizationOperator.setLimits")(function* (
    operator: OrganizationOperator & { readonly guildId: string },
    limits: OrganizationLimits,
  ) {
    yield* audited(operator, "limits.set", (transaction, now) =>
      transaction
        .update(guildTable)
        .set({ ...limits, updatedAt: now })
        .where(eq(guildTable.id, operator.guildId))
        .pipe(Effect.as({ ...limits })),
    );
  });

  const clearVanityUrl = Effect.fn("organizationOperator.clearVanityUrl")(
    function* (operator: OrganizationOperator & { readonly guildId: string }) {
      yield* audited(
        operator,
        "vanity-url.clear",
        (transaction, now) =>
          transaction
            .select({ vanityUrl: guildTable.vanityUrl })
            .from(guildTable)
            .where(eq(guildTable.id, operator.guildId))
            .pipe(
              Effect.tap(() =>
                transaction
                  .update(guildTable)
                  .set({ vanityUrl: null, updatedAt: now })
                  .where(eq(guildTable.id, operator.guildId)),
              ),
              Effect.map((rows) => ({ previous: rows[0]?.vanityUrl ?? null })),
            ),
        { accessChanged: true },
      );
    },
  );

  const refreshDiscordSync = Effect.fn("organizationOperator.refreshSync")(
    function* (operator: OrganizationOperator & { readonly guildId: string }) {
      yield* requireOrganization(database, operator.guildId);
      yield* ports.refreshDiscordSync(operator.guildId);
      yield* audited(operator, "discord-sync.refresh", () =>
        Effect.succeed(null),
      );
    },
  );

  const suspend = Effect.fn("organizationOperator.suspend")(function* (
    operator: OrganizationOperator & { readonly guildId: string },
    reason: string,
  ) {
    yield* audited(
      operator,
      "suspend",
      (transaction, now) =>
        transaction
          .update(guildTable)
          .set({
            suspendedAt: now,
            suspendedReason: reason,
            suspendedBy: operator.operatorName,
            updatedAt: now,
          })
          .where(eq(guildTable.id, operator.guildId))
          .pipe(Effect.as({ reason })),
      { accessChanged: true },
    );
  });

  const resume = Effect.fn("organizationOperator.resume")(function* (
    operator: OrganizationOperator & { readonly guildId: string },
  ) {
    yield* audited(
      operator,
      "resume",
      (transaction, now) =>
        transaction
          .update(guildTable)
          .set({
            suspendedAt: null,
            suspendedReason: null,
            suspendedBy: null,
            updatedAt: now,
          })
          .where(eq(guildTable.id, operator.guildId))
          .pipe(Effect.as(null)),
      { accessChanged: true },
    );
  });

  return { setLimits, clearVanityUrl, refreshDiscordSync, suspend, resume };
};
