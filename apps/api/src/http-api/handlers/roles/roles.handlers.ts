import { RolesData } from "#src/guilds/roles-data";
import { OrganizationWorkspaceOperationError } from "#src/guilds/organization-workspace-access";
import {
  pathString,
  optionalPathString,
} from "#src/shared/http/handler-response";
import { Effect } from "effect";
import { AccessRequirement } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import {
  RolesResponse,
  RoleResponse,
  type UpdateRolePermissionsRequest,
} from "#src/contracts/roles/schemas";
import {
  requireGuild,
  decode,
  toOrganizationWorkspaceHttpResponse,
} from "../../access/organization-workspace.access.js";
import { HttpApiBuilder } from "effect/http-api";
import { LootlogApi } from "../../lootlog-api.js";

const rolesData = <A>(
  operation: (
    service: RolesData["Service"],
  ) => Effect.Effect<A, OrganizationWorkspaceOperationError>,
) => Effect.flatMap(RolesData, operation);

export const updateGuildRole = Effect.fn("RolesControllerUpdateGuildRole")(
  function* (
    guildId: string,
    roleId: string,
    payload: UpdateRolePermissionsRequest,
  ) {
    const access = yield* requireGuild(guildId, {
      anyOf: AccessRequirement.ADMINISTER,
    });

    const value = yield* rolesData((service) =>
      service.updateRole(access.discordId, access.guildId, roleId, payload),
    );

    return yield* decode(RoleResponse, value);
  },
);

const getGuildRoles = Effect.fn("RolesControllerGetGuildRoles")(function* (
  guildId: string,
) {
  const access = yield* requireGuild(guildId, [Permission.LOOTLOG_ACCESS]);

  const value = yield* rolesData((service) => service.getRoles(access.guildId));

  return yield* decode(RolesResponse, value);
});

const getGuildRolesFromPath = (guildId: string | undefined) =>
  toOrganizationWorkspaceHttpResponse(
    Effect.flatMap(pathString(guildId, "guildId"), getGuildRoles),
  );

const updateGuildRoleFromPath = (
  guildId: string | undefined,
  roleId: string,
  payload: UpdateRolePermissionsRequest,
) =>
  toOrganizationWorkspaceHttpResponse(
    Effect.flatMap(pathString(guildId, "guildId"), (decodedGuildId) =>
      updateGuildRole(decodedGuildId, roleId, payload),
    ),
  );

export const RolesHandlers = HttpApiBuilder.group(
  LootlogApi,
  "roles",
  (handlers) =>
    handlers
      .handle("RolesControllerGetGuildRoles", ({ params }) =>
        getGuildRolesFromPath(optionalPathString(params.guildId)),
      )
      .handle("RolesControllerUpdateGuildRole", ({ params, payload }) =>
        updateGuildRoleFromPath(
          optionalPathString(params.guildId),
          params.roleId,
          payload,
        ),
      ),
);
