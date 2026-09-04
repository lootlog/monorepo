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
        toAccountOrganizationHttpResponse(
          guildRead(params.guildId).pipe(
            Effect.withSpan("GuildsControllerGetGuildById", {
              attributes: { operationId: "GuildsControllerGetGuildById" },
            }),
          ),
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
        toAccountOrganizationHttpResponse(guildPermissions(params.guildId)),
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
