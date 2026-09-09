import type { RESTAPIPartialCurrentUserGuild } from "discord-api-types/v10";
import { Effect } from "effect";
import { apiKeyAllowsOrganization } from "@lootlog/schema/api-key-policy";
import { requestApiKeyAccess } from "#src/runtime/auth/forward-auth-identity";
import { isDiscordAdministrator } from "#src/discord/is-discord-administrator";
import {
  ApplicationError,
  ApplicationErrorKind,
} from "#src/shared/http/http-errors";
import {
  type AuthenticatedIdentity,
  AccountOrganizationOperationError,
} from "./account-organization.operations.js";

export const makeManageableGuilds = (
  getDiscordGuilds: (
    identity: AuthenticatedIdentity,
  ) => Effect.Effect<ReadonlyArray<RESTAPIPartialCurrentUserGuild>, unknown>,
) => {
  const getManageableUserGuilds = Effect.fn("getManageableUserGuilds")(
    function* (identity: AuthenticatedIdentity) {
      const apiKey = yield* requestApiKeyAccess;
      const guilds = yield* getDiscordGuilds(identity).pipe(
        Effect.catch((error) =>
          error instanceof ApplicationError &&
          error.kind === ApplicationErrorKind.AUTHENTICATION_REQUIRED
            ? Effect.succeed([])
            : Effect.fail(error),
        ),
      );
      return guilds
        .filter((guild) => apiKeyAllowsOrganization(apiKey, guild.id))
        .filter((guild) => isDiscordAdministrator(BigInt(guild.permissions)))
        .map((guild) => ({
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
        }));
    },
  );
  return (identity: AuthenticatedIdentity) =>
    getManageableUserGuilds(identity).pipe(
      Effect.mapError(
        (cause) => new AccountOrganizationOperationError({ cause }),
      ),
    );
};
