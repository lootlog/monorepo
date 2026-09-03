import type { APIGuild } from "discord-api-types/v10";
import { Effect } from "effect";
import { isDiscordAdministrator } from "#src/discord/is-discord-administrator";
import {
  ApplicationError,
  ApplicationErrorKind,
} from "#src/shared/http/http-errors";
import {
  type AuthenticatedIdentity,
  UsersGuildsOperationError,
} from "./users-guilds.handlers.js";

export const makeManageableGuilds = (
  getDiscordGuilds: (
    identity: AuthenticatedIdentity,
  ) => Effect.Effect<ReadonlyArray<APIGuild>, unknown>,
) => {
  const getManageableUserGuilds = Effect.fn("getManageableUserGuilds")(
    function* (identity: AuthenticatedIdentity) {
      const guilds = yield* getDiscordGuilds(identity).pipe(
        Effect.catch((error) =>
          error instanceof ApplicationError &&
          error.kind === ApplicationErrorKind.AUTHENTICATION_REQUIRED
            ? Effect.succeed([])
            : Effect.fail(error),
        ),
      );
      return guilds
        .filter((guild) => isDiscordAdministrator(BigInt(guild.permissions)))
        .map((guild) => ({
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          ownerId: guild.owner_id,
        }));
    },
  );
  return (identity: AuthenticatedIdentity) =>
    getManageableUserGuilds(identity).pipe(
      Effect.mapError((cause) => new UsersGuildsOperationError({ cause })),
    );
};
