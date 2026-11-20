import { withAdapterSpan } from "@lootlog/instrumentation/operation";
import { OrganizationWorkspaceOperationError } from "#src/guilds/organization-workspace-access";
import type { GuildMemberChanged } from "@lootlog/protocol/rabbit/events";
import { selectActiveRoleHolders } from "#src/members/member-role-holders";
import { Clock, Context, Effect, Layer } from "effect";
import {
  createAccessPolicy,
  AccessRequirement,
} from "@lootlog/domain/access-policy";
import { and, desc, eq } from "drizzle-orm";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  roleTable,
} from "#src/database/drizzle/organization.schema";
import {
  PermissionDeniedError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import { getPermissionsCachePattern } from "#src/shared/cache";
import type { UpdateRolePermissionsRequest } from "#src/contracts/roles/schemas";

type DataEffect<A> = Effect.Effect<A, OrganizationWorkspaceOperationError>;

type RoleRecord = typeof roleTable.$inferSelect;

export class RolesData extends Context.Service<
  RolesData,
  {
    readonly getRoles: (
      guildId: string,
    ) => DataEffect<ReadonlyArray<RoleRecord>>;
    readonly updateRole: (
      discordId: string,
      guildId: string,
      roleId: string,
      payload: UpdateRolePermissionsRequest,
    ) => DataEffect<RoleRecord | null>;
  }
>()("@lootlog/api/http-api/roles/data") {
  static layerDatabase(cache: RolesCache, events: RolePolicyEvents) {
    return Layer.effect(
      RolesData,
      Effect.map(ApiDatabase, (database) => {
        const operation = <A, E>(effect: Effect.Effect<A, E>) =>
          effect.pipe(
            Effect.mapError(
              (cause) => new OrganizationWorkspaceOperationError({ cause }),
            ),
          );

        return RolesData.of({
          getRoles: (guildId) =>
            operation(
              database
                .select()
                .from(roleTable)
                .where(eq(roleTable.guildId, guildId))
                .orderBy(desc(roleTable.position)),
            ),
          updateRole: (discordId, guildId, roleId, payload) =>
            operation(
              Effect.gen(function* () {
                const roles = yield* database
                  .select()
                  .from(roleTable)
                  .where(
                    and(
                      eq(roleTable.id, roleId),
                      eq(roleTable.guildId, guildId),
                    ),
                  )
                  .limit(1);

                const role = roles[0];

                if (!role)
                  return yield* Effect.fail(new ResourceNotFoundError());

                const owners = yield* database
                  .select({ ownerId: guildTable.ownerId })
                  .from(guildTable)
                  .where(eq(guildTable.id, guildId))
                  .limit(1);

                const roleIsAdministrative = createAccessPolicy({
                  capabilities: role.permissions,
                }).allowsAny(AccessRequirement.ADMINISTER);

                const newPermissionsAreAdministrative = createAccessPolicy({
                  capabilities: payload.permissions,
                }).allowsAny(AccessRequirement.ADMINISTER);

                if (
                  roleIsAdministrative !== newPermissionsAreAdministrative &&
                  owners[0]?.ownerId !== discordId
                ) {
                  return yield* Effect.fail(new PermissionDeniedError());
                }

                // Republish on repeated saves too: a previous attempt may have
                // committed the policy before cache invalidation or delivery failed.
                const updated = yield* database
                  .update(roleTable)
                  .set({
                    permissions: [...payload.permissions],
                    lvlRangeFrom: payload.lvlRangeFrom,
                    lvlRangeTo: payload.lvlRangeTo,
                    updatedAt: new Date(yield* Clock.currentTimeMillis),
                  })
                  .where(
                    and(
                      eq(roleTable.id, roleId),
                      eq(roleTable.guildId, guildId),
                    ),
                  )
                  .returning();

                yield* cache.deleteByPattern(
                  getPermissionsCachePattern(guildId),
                );

                const members = yield* selectActiveRoleHolders(
                  database,
                  guildId,
                  roleId,
                );

                yield* Effect.forEach(
                  members,
                  (member) =>
                    member.userId
                      ? cache
                          .invalidateUserGuildPermissions(member.discordId)
                          .pipe(
                            Effect.andThen(
                              events.memberPolicyChanged({
                                guildId,
                                discordId: member.discordId,
                                userId: member.userId,
                              }),
                            ),
                          )
                      : Effect.void,
                  { concurrency: 4, discard: true },
                );

                return updated[0] ?? null;
              }).pipe(
                withAdapterSpan("roles.update.persistence", "ApiDatabase"),
              ),
            ),
        });
      }),
    );
  }
}

export interface RolePolicyEvents {
  readonly memberPolicyChanged: (
    member: typeof GuildMemberChanged.Type,
  ) => Effect.Effect<void, unknown>;
}

export interface RolesCache {
  readonly invalidateUserGuildPermissions: (
    discordId: string,
  ) => Effect.Effect<void, unknown>;
  readonly deleteByPattern: (pattern: string) => Effect.Effect<void, unknown>;
}
