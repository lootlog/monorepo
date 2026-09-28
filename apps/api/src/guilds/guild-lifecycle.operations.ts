import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Capability, createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { and, eq, inArray } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import { uniq } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  discordGuildSyncStateTable,
  guildTable,
  itemRarityEnum,
  lootlogConfigNpcTable,
  lootlogConfigTable,
  memberTable,
  npcTypeEnum,
  roleTable,
} from "#src/database/drizzle/schema";
import type {
  GuildCreated,
  GuildDeleted,
  GuildRoleChanged,
  GuildRoleDeleted,
  GuildUpdated,
} from "@lootlog/protocol/rabbit/events";
import { MEMBER_LAST_DISCORD_STATUS } from "#src/members/member-discord-status";
import { selectActiveRoleHolders } from "#src/members/member-role-holders";
import { queueMemberDeliveries } from "#src/members/member.store";
import { DiscordGuildSyncStatus } from "@lootlog/schema/notifications";
import { getPermissionsCachePattern } from "#src/shared/cache";
import { getGuildCacheKey } from "#src/guilds/guild-configuration-cache";

class GuildLifecycleFailure extends TaggedErrorClass<GuildLifecycleFailure>()(
  "GuildLifecycleFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export interface GuildLifecyclePorts {
  readonly invalidateUserGuildPermissions: (
    discordId: string,
  ) => Effect.Effect<unknown, unknown>;
  readonly clearCachePattern: (
    pattern: string,
  ) => Effect.Effect<unknown, unknown>;
  readonly clearCacheKey: (key: string) => Effect.Effect<unknown, unknown>;
  /** Delivers member changes queued in the `MemberSyncDelivery` outbox. */
  readonly deliverMemberChanges: (
    memberIds: ReadonlyArray<number>,
  ) => Effect.Effect<unknown, unknown>;
}

type Transaction = Parameters<typeof queueMemberDeliveries>[0];

const adminPermissions = (admin: boolean): Permission[] =>
  admin
    ? Object.values(Permission).filter(
        (permission) => permission !== Permission.OWNER,
      )
    : [];

export const makeGuildLifecycle = (
  database: ApiDatabaseValue,
  ports: GuildLifecyclePorts,
) => {
  const operation = <A>(name: string, effect: Effect.Effect<A, unknown>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new GuildLifecycleFailure({ operation: name, cause }),
      ),
      Effect.withSpan(name, {
        attributes: { adapter: "api.database", retryCount: 0 },
      }),
    );

  // Owner access comes from the Organization row rather than a member role, so
  // no member write invalidates it. Owners who are active members also queue a
  // Gateway rebalance with the ownership change.
  const queueOwnerRebalance = (
    transaction: Transaction,
    guildId: string,
    ownerIds: ReadonlyArray<string>,
  ) =>
    Effect.gen(function* () {
      if (ownerIds.length === 0) return [];

      const members = yield* transaction
        .select({ id: memberTable.id })
        .from(memberTable)
        .where(
          and(
            eq(memberTable.guildId, guildId),
            eq(memberTable.active, true),
            inArray(memberTable.userId, [...ownerIds]),
          ),
        );

      const memberIds = members.map(({ id }) => id);
      yield* queueMemberDeliveries(transaction, memberIds, true);

      return memberIds;
    });

  // The outbox makes a redelivered role event unnecessary for a change whose
  // invalidation or publication failed after commit.
  const queueRoleHolders = (
    transaction: Transaction,
    role: { readonly id: string; readonly guildId: string },
  ) =>
    Effect.gen(function* () {
      const holders = yield* selectActiveRoleHolders(
        transaction,
        role.guildId,
        role.id,
      );

      const memberIds = holders.map(({ id }) => id);
      yield* queueMemberDeliveries(transaction, memberIds, true);

      return memberIds;
    });

  const invalidateOwners = (ownerIds: ReadonlyArray<string>) =>
    Effect.forEach(uniq(ownerIds), ports.invalidateUserGuildPermissions, {
      concurrency: "unbounded",
      discard: true,
    });

  const createGuild = Effect.fn("guildLifecycle.create")(function* (
    data: GuildCreated,
  ) {
    const now = new Date(yield* Clock.currentTimeMillis);

    const guild = yield* operation(
      "guildLifecycle.create.transaction",
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const previousRows = yield* transaction
            .select({ ownerId: guildTable.ownerId, active: guildTable.active })
            .from(guildTable)
            .where(eq(guildTable.id, data.guildId))
            .limit(1)
            .for("update");

          const previous = previousRows[0];

          const guildRows = yield* transaction
            .insert(guildTable)
            .values({
              id: data.guildId,
              name: data.name,
              icon: data.icon,
              ownerId: data.ownerId,
              active: true,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: guildTable.id,
              set: {
                name: data.name,
                icon: data.icon,
                ownerId: data.ownerId,
                active: true,
                updatedAt: now,
              },
            })
            .returning();

          const result = guildRows[0];

          if (!result) return yield* Effect.fail("Guild was not returned");

          if (data.roles.length > 0) {
            yield* transaction
              .insert(roleTable)
              .values(
                data.roles.map((role) => ({
                  id: role.id,
                  guildId: data.guildId,
                  name: role.name,
                  color: role.color,
                  position: role.position,
                  permissions: adminPermissions(role.admin),
                  createdAt: now,
                  updatedAt: now,
                })),
              )
              .onConflictDoNothing();
          }

          yield* transaction
            .insert(lootlogConfigTable)
            .values({ id: data.guildId, createdAt: now, updatedAt: now })
            .onConflictDoNothing();
          yield* transaction
            .insert(lootlogConfigNpcTable)
            .values(
              npcTypeEnum.enumValues.map((npcType) => ({
                lootlogConfigId: data.guildId,
                npcType,
                allowedRarities: [...itemRarityEnum.enumValues],
                createdAt: now,
                updatedAt: now,
              })),
            )
            .onConflictDoNothing();
          yield* transaction
            .insert(discordGuildSyncStateTable)
            .values({
              guildId: data.guildId,
              status: DiscordGuildSyncStatus.STALE,
              hasRequiredPermissions: false,
              requiredPermissions: [],
              grantedPermissions: [],
              missingPermissions: [],
              channelCount: 0,
              selectableChannelCount: 0,
              lastAttemptAt: null,
              lastSuccessAt: null,
              lastError: null,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: discordGuildSyncStateTable.guildId,
              set: { status: DiscordGuildSyncStatus.STALE, updatedAt: now },
            });

          const owners = uniq([
            data.ownerId,
            ...(previous ? [previous.ownerId] : []),
          ]);

          // Discord replays creation for known guilds; only activation or an
          // ownership transfer changes what an owner member may access.
          const ownerMemberIds =
            !previous?.active || previous.ownerId !== data.ownerId
              ? yield* queueOwnerRebalance(transaction, data.guildId, owners)
              : [];

          return { guild: result, owners, ownerMemberIds };
        }),
      ),
    );

    // An owner who opened Lootlog before adding the bot has a cached projection
    // without this Organization.
    yield* invalidateOwners(guild.owners);
    yield* ports.deliverMemberChanges(guild.ownerMemberIds);

    return guild.guild;
  });

  const updateGuild = Effect.fn("guildLifecycle.update")(function* (
    data: GuildUpdated,
  ) {
    const now = new Date(yield* Clock.currentTimeMillis);

    const update = yield* operation(
      "guildLifecycle.update.transaction",
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const rows = yield* transaction
            .select({
              vanityUrl: guildTable.vanityUrl,
              ownerId: guildTable.ownerId,
            })
            .from(guildTable)
            .where(eq(guildTable.id, data.guildId))
            .limit(1)
            .for("update");

          const oldGuild = rows[0] ?? null;

          yield* transaction
            .update(guildTable)
            .set({
              name: data.name,
              icon: data.icon,
              ownerId: data.ownerId,
              updatedAt: now,
            })
            .where(eq(guildTable.id, data.guildId));

          const transferredFrom =
            oldGuild && oldGuild.ownerId !== data.ownerId
              ? [oldGuild.ownerId]
              : [];

          return {
            oldGuild,
            owners: [data.ownerId, ...transferredFrom],
            ownerMemberIds:
              transferredFrom.length > 0
                ? yield* queueOwnerRebalance(transaction, data.guildId, [
                    data.ownerId,
                    ...transferredFrom,
                  ])
                : [],
          };
        }),
      ),
    );

    const { oldGuild } = update;

    yield* Effect.all(
      [
        ports.clearCachePattern(getPermissionsCachePattern(data.guildId)),
        ports.clearCacheKey(getGuildCacheKey(data.guildId)),
        oldGuild?.vanityUrl
          ? ports.clearCacheKey(getGuildCacheKey(oldGuild.vanityUrl))
          : Effect.void,
      ],
      { concurrency: "unbounded", discard: true },
    );
    yield* invalidateOwners(update.owners);
    yield* ports.deliverMemberChanges(update.ownerMemberIds);

    return oldGuild?.vanityUrl ?? null;
  });

  const deleteGuild = Effect.fn("guildLifecycle.delete")(function* (
    data: GuildDeleted,
  ) {
    const now = new Date(yield* Clock.currentTimeMillis);

    const deletion = yield* operation(
      "guildLifecycle.delete.transaction",
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const guildRows = yield* transaction
            .select({
              vanityUrl: guildTable.vanityUrl,
              ownerId: guildTable.ownerId,
            })
            .from(guildTable)
            .where(eq(guildTable.id, data.guildId))
            .limit(1);

          yield* transaction
            .delete(lootlogConfigNpcTable)
            .where(eq(lootlogConfigNpcTable.lootlogConfigId, data.guildId));
          yield* transaction
            .delete(lootlogConfigTable)
            .where(eq(lootlogConfigTable.id, data.guildId));

          const members = yield* transaction
            .update(memberTable)
            .set({
              active: false,
              lastDiscordAttemptAt: now,
              lastDiscordStatus: MEMBER_LAST_DISCORD_STATUS.GUILD_DEACTIVATED,
              updatedAt: now,
            })
            .where(
              and(
                eq(memberTable.guildId, data.guildId),
                eq(memberTable.active, true),
              ),
            )
            .returning({ id: memberTable.id });

          const memberIds = members.map(({ id }) => id);
          // Redelivered deletions no longer see these members as active; the
          // committed outbox rows keep their removal retryable.
          yield* queueMemberDeliveries(transaction, memberIds, true);
          yield* transaction
            .delete(roleTable)
            .where(eq(roleTable.guildId, data.guildId));
          yield* transaction
            .update(guildTable)
            .set({ active: false, updatedAt: now })
            .where(eq(guildTable.id, data.guildId));

          return {
            vanityUrl: guildRows[0]?.vanityUrl ?? null,
            ownerId: guildRows[0]?.ownerId ?? null,
            memberIds,
          };
        }),
      ),
    );

    yield* ports.deliverMemberChanges(deletion.memberIds);
    yield* invalidateOwners(deletion.ownerId ? [deletion.ownerId] : []);
    yield* Effect.all(
      [
        ports.clearCachePattern(getPermissionsCachePattern(data.guildId)),
        ports.clearCacheKey(getGuildCacheKey(data.guildId)),
        deletion.vanityUrl
          ? ports.clearCacheKey(getGuildCacheKey(deletion.vanityUrl))
          : Effect.void,
      ],
      { concurrency: "unbounded", discard: true },
    );

    return deletion.vanityUrl;
  });

  const upsertRole = Effect.fn("guildLifecycle.role.upsert")(function* (
    data: GuildRoleChanged,
  ) {
    const existing = yield* database
      .select({ permissions: roleTable.permissions })
      .from(roleTable)
      .where(
        and(eq(roleTable.id, data.id), eq(roleTable.guildId, data.guildId)),
      )
      .limit(1)
      .pipe(Effect.map((rows) => rows[0] ?? null));

    const permissions = adminPermissions(data.admin);

    const existingAdmin = existing
      ? createAccessPolicy({ capabilities: existing.permissions }).allows(
          Capability.ADMIN,
        )
      : false;

    const now = new Date(yield* Clock.currentTimeMillis);

    const roleUpdate: Partial<typeof roleTable.$inferInsert> = {
      name: data.name,
      color: data.color,
      position: data.position,
      updatedAt: now,
    };

    if (existingAdmin !== data.admin) roleUpdate.permissions = permissions;

    // Name, color, and position edits leave every permission projection
    // unchanged. A new role has no holders; member sync queues assignments.
    const permissionsChanged =
      existing !== null && existingAdmin !== data.admin;

    const holderIds = yield* operation(
      "guildLifecycle.role.upsert.transaction",
      database.transaction((transaction) =>
        Effect.gen(function* () {
          yield* transaction
            .insert(roleTable)
            .values({
              id: data.id,
              guildId: data.guildId,
              name: data.name,
              color: data.color,
              position: data.position,
              permissions,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: roleTable.id,
              set: roleUpdate,
            });

          if (!permissionsChanged) return [];

          return yield* queueRoleHolders(transaction, data);
        }),
      ),
    );

    yield* ports.clearCachePattern(getPermissionsCachePattern(data.guildId));
    yield* ports.deliverMemberChanges(holderIds);
  });

  const deleteRole = Effect.fn("guildLifecycle.role.delete")(function* (
    data: GuildRoleDeleted,
  ) {
    const holderIds = yield* operation(
      "guildLifecycle.role.delete.transaction",
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const roles = yield* transaction
            .select({ permissions: roleTable.permissions })
            .from(roleTable)
            .where(
              and(
                eq(roleTable.id, data.id),
                eq(roleTable.guildId, data.guildId),
              ),
            )
            .limit(1)
            .for("update");

          // Projections omit roles without permissions, so deleting one
          // changes nothing. Assignments cascade, so queue holders first.
          const holders =
            (roles[0]?.permissions.length ?? 0) > 0
              ? yield* queueRoleHolders(transaction, data)
              : [];

          yield* transaction
            .delete(roleTable)
            .where(
              and(
                eq(roleTable.id, data.id),
                eq(roleTable.guildId, data.guildId),
              ),
            );

          return holders;
        }),
      ),
    );

    yield* ports.clearCachePattern(getPermissionsCachePattern(data.guildId));
    yield* ports.deliverMemberChanges(holderIds);
  });

  return { createGuild, updateGuild, deleteGuild, upsertRole, deleteRole };
};

export type GuildLifecycle = ReturnType<typeof makeGuildLifecycle>;
