import { optionalPathString } from "#src/shared/http/handler-response";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LootlogApi } from "../../lootlog-api.js";
import {
  getGuildRolesFromPath,
  updateGuildRoleFromPath,
} from "../organization-workspace/organization-workspace.operations.js";

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
