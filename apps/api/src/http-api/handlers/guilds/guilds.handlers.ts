import { Effect } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LootlogApi } from "../../lootlog-api.js";
import {
  currentGuildPermissionsList,
  guildDiscordSync,
  guildPermissions,
  guildRead,
  guildWorlds,
  legacyCurrentGuildList,
  manageableCurrentGuildList,
  toAccountOrganizationHttpResponse,
  toDeclaredAccountOrganizationError,
  updateGuildConfiguration,
} from "../account-organization/account-organization.operations.js";

export const GuildsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "guilds",
  (handlers) =>
    handlers
      .handle("GuildsControllerGetUserGuilds", ({ query }) =>
        toAccountOrganizationHttpResponse(legacyCurrentGuildList(query.source)),
      )
      .handle("GuildsControllerGetUserGuildsWithPermissions", () =>
        toAccountOrganizationHttpResponse(currentGuildPermissionsList()),
      )
      .handle("GuildsControllerGetManageableUserGuilds", () =>
        toAccountOrganizationHttpResponse(manageableCurrentGuildList()),
      )
      .handle("GuildsControllerGetGuildById", ({ params }) =>
        toDeclaredAccountOrganizationError(
          guildRead(params.guildId).pipe(
            Effect.withSpan("GuildsControllerGetGuildById", {
              attributes: { operationId: "GuildsControllerGetGuildById" },
            }),
          ),
          [403],
        ),
      )
      .handle("GuildsControllerGetGuildConfig", ({ params }) =>
        toAccountOrganizationHttpResponse(
          guildRead(params.guildId).pipe(
            Effect.withSpan("GuildsControllerGetGuildConfig", {
              attributes: { operationId: "GuildsControllerGetGuildConfig" },
            }),
          ),
        ),
      )
      .handle("GuildsControllerUpdateGuildConfig", ({ params, payload }) =>
        toAccountOrganizationHttpResponse(
          updateGuildConfiguration(params.guildId, payload),
        ),
      )
      .handle("GuildsControllerGetWorldsByGuildId", ({ params }) =>
        toAccountOrganizationHttpResponse(guildWorlds(params.guildId)),
      )
      .handle("GuildsControllerGetGuildPermissions", ({ params }) =>
        toDeclaredAccountOrganizationError(
          guildPermissions(params.guildId),
          [403],
        ),
      )
      .handle("GuildsControllerGetGuildDiscordSyncStatus", ({ params }) =>
        toAccountOrganizationHttpResponse(
          guildDiscordSync(params.guildId, false),
        ),
      )
      .handle("GuildsControllerRefreshGuildDiscordSync", ({ params }) =>
        toAccountOrganizationHttpResponse(
          guildDiscordSync(params.guildId, true),
        ),
      ),
);
