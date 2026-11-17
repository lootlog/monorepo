import { GuildConfigurationData } from "#src/guilds/guild-configuration-data";
import { AccountOrganizationOperationError } from "#src/guilds/account-organization-data";
import { AccessRequirement } from "@lootlog/domain/access-policy";
import { DiscordGuildSyncStateResponse as DiscordGuildSyncStateCodec } from "#src/shared/schema/discord-guild-sync";
import { encodeUnknownResponse } from "#src/shared/schema/encode-response";
import { Permission } from "@lootlog/schema/permissions";
import {
  DiscordGuildSyncStateResponse as DiscordGuildSyncStateSchema,
  OrganizationCapabilitiesResponse,
  ManageableOrganizationsResponse,
  OrganizationWorldsResponse,
  type UpdateOrganizationConfigRequest,
} from "#src/contracts/guilds/schemas";
import { OrganizationSummary } from "#src/contracts/shared";
import {
  decode,
  identity,
  data,
  authorizeGuild,
  toAccountOrganizationHttpResponse,
} from "../../access/account-organization.access.js";
import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { LootlogApi } from "../../lootlog-api.js";

const guildConfigurationData = <A>(
  operation: (
    service: GuildConfigurationData["Service"],
  ) => Effect.Effect<A, AccountOrganizationOperationError>,
) => Effect.flatMap(GuildConfigurationData, operation);

const manageableCurrentGuildList = Effect.fn("manageableCurrentGuildList")(
  function* () {
    const current = yield* identity;

    const value = yield* data((service) =>
      service.getManageableUserGuilds(current),
    );

    return yield* decode(ManageableOrganizationsResponse, value);
  },
);

const guildRead = Effect.fn("guildRead")(function* (guildId: string) {
  const authorized = yield* authorizeGuild(guildId, [
    Permission.LOOTLOG_ACCESS,
  ]);

  const value = yield* guildConfigurationData((service) =>
    service.getGuildById(authorized.guildId),
  );

  return yield* decode(OrganizationSummary, value);
});

export const updateGuildConfiguration = Effect.fn(
  "GuildsControllerUpdateGuildConfig",
)(function* (guildId: string, payload: UpdateOrganizationConfigRequest) {
  const authorized = yield* authorizeGuild(
    guildId,
    AccessRequirement.ADMINISTER,
  );

  const value = yield* guildConfigurationData((service) =>
    service.updateGuildConfig(authorized.guildId, payload),
  );

  return yield* decode(OrganizationSummary, value);
});

const guildWorlds = Effect.fn("GuildsControllerGetWorldsByGuildId")(function* (
  guildId: string,
) {
  const authorized = yield* authorizeGuild(guildId, [
    Permission.LOOTLOG_ACCESS,
  ]);

  const value = yield* guildConfigurationData((service) =>
    service.getWorldsByGuildId(authorized.guildId),
  );

  return yield* decode(OrganizationWorldsResponse, value);
});

export const guildPermissions = Effect.fn("guildPermissions")(function* (
  guildId: string,
) {
  const authorized = yield* authorizeGuild(guildId, [
    Permission.LOOTLOG_ACCESS,
  ]);

  return yield* decode(
    OrganizationCapabilitiesResponse,
    authorized.permissions,
  );
});

const guildDiscordSync = Effect.fn("guildDiscordSync")(function* (
  guildId: string,
  refresh: boolean,
) {
  const authorized = yield* authorizeGuild(
    guildId,
    AccessRequirement.ADMINISTER,
  );

  const value = yield* data((service) =>
    refresh
      ? service.refreshGuildDiscordSync(authorized.guildId)
      : service.getGuildDiscordSyncStatus(authorized.guildId),
  );

  const encoded = encodeUnknownResponse(DiscordGuildSyncStateCodec, value);

  return yield* decode(DiscordGuildSyncStateSchema, encoded);
});

export const GuildsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "guilds",
  (handlers) =>
    handlers
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
