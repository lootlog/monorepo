import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Capability, createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { and, eq } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
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
import { DiscordGuildSyncStatus } from "@lootlog/schema/notifications";
import {
  getGuildCacheKey,
  getPermissionsCachePattern,
} from "#src/shared/cache";

export class GuildLifecycleFailure extends TaggedErrorClass<GuildLifecycleFailure>()(
  "GuildLifecycleFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export interface GuildLifecyclePorts {
  readonly clearCachePattern: (
    pattern: string,
  ) => Effect.Effect<unknown, unknown>;
  readonly clearCacheKey: (key: string) => Effect.Effect<unknown, unknown>;
  readonly notifyMembersRemoved: (
    members: ReadonlyArray<{
      readonly discordId: string;
      readonly guildId: string;
      readonly globalUserId: string | null;
    }>,
  ) => Effect.Effect<unknown, unknown>;
}

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

  const createGuild = Effect.fn("guildLifecycle.create")(function* (
    data: GuildCreated,
  ) {
    const now = new Date(yield* Clock.currentTimeMillis);
    const guild = yield* operation(
      "guildLifecycle.create.transaction",
      database.transaction((transaction) =>
        Effect.gen(function* () {
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
          return result;
        }),
      ),
    );
    return guild;
  });

  const updateGuild = Effect.fn("guildLifecycle.update")(function* (
    data: GuildUpdated,
  ) {
    const oldGuild = yield* operation(
      "guildLifecycle.update.read",
      database
        .select({ vanityUrl: guildTable.vanityUrl })
        .from(guildTable)
        .where(eq(guildTable.id, data.guildId))
        .limit(1)
        .pipe(Effect.map((rows) => rows[0] ?? null)),
    );
    yield* operation(
      "guildLifecycle.update.write",
      database
        .update(guildTable)
        .set({
          name: data.name,
          icon: data.icon,
          ownerId: data.ownerId,
          updatedAt: new Date(yield* Clock.currentTimeMillis),
        })
        .where(eq(guildTable.id, data.guildId)),
    );
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
            .select({ vanityUrl: guildTable.vanityUrl })
            .from(guildTable)
            .where(eq(guildTable.id, data.guildId))
            .limit(1);
          const members = yield* transaction
            .select({
              discordId: memberTable.userId,
              guildId: memberTable.guildId,
              globalUserId: memberTable.globalUserId,
            })
            .from(memberTable)
            .where(
              and(
                eq(memberTable.guildId, data.guildId),
                eq(memberTable.active, true),
              ),
            );
          yield* transaction
            .delete(lootlogConfigNpcTable)
            .where(eq(lootlogConfigNpcTable.lootlogConfigId, data.guildId));
          yield* transaction
            .delete(lootlogConfigTable)
            .where(eq(lootlogConfigTable.id, data.guildId));
          yield* transaction
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
            );
          yield* transaction
            .delete(roleTable)
            .where(eq(roleTable.guildId, data.guildId));
          yield* transaction
            .update(guildTable)
            .set({ active: false, updatedAt: now })
            .where(eq(guildTable.id, data.guildId));
          return {
            vanityUrl: guildRows[0]?.vanityUrl ?? null,
            members,
          };
        }),
      ),
    );
    yield* ports.notifyMembersRemoved(deletion.members);
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
    yield* operation(
      "guildLifecycle.role.upsert.write",
      database
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
          set: {
            name: data.name,
            color: data.color,
            position: data.position,
            ...(existingAdmin === data.admin ? {} : { permissions }),
            updatedAt: now,
          },
        }),
    );
    yield* ports.clearCachePattern(getPermissionsCachePattern(data.guildId));
  });

  const deleteRole = Effect.fn("guildLifecycle.role.delete")(function* (
    data: GuildRoleDeleted,
  ) {
    yield* operation(
      "guildLifecycle.role.delete.write",
      database
        .delete(roleTable)
        .where(
          and(eq(roleTable.id, data.id), eq(roleTable.guildId, data.guildId)),
        ),
    );
    yield* ports.clearCachePattern(getPermissionsCachePattern(data.guildId));
  });

  return { createGuild, updateGuild, deleteGuild, upsertRole, deleteRole };
};

export type GuildLifecycle = ReturnType<typeof makeGuildLifecycle>;
