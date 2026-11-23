import { RpcGuildLookup } from "@lootlog/rpc/api";
import { RpcNotFoundError, RpcUnavailableError } from "@lootlog/rpc/errors";
import {
  InternalMemberIdentityResponse,
  type InternalUserPermissionsQuery,
} from "@lootlog/schema/internal-guilds";
import { UserGuildPermissionsDtoSchema } from "@lootlog/schema/permissions";
import { Effect, Schema } from "effect";
import { InternalGuildsData } from "#src/guilds/internal-guilds-data";

const UserPermissionsList = Schema.Array(UserGuildPermissionsDtoSchema);

const unavailable = (message: string) => () =>
  new RpcUnavailableError({ message });

export const getUserGuildPermissions = Effect.fn("getUserGuildPermissions")(
  function* ({ discordId, userId, freshness }: InternalUserPermissionsQuery) {
    if (discordId.length === 0 || userId.length === 0) return [];

    const data = yield* InternalGuildsData;

    return yield* data
      .getUserPermissions(discordId, userId, freshness)
      .pipe(
        Effect.flatMap(Schema.decodeEffect(UserPermissionsList)),
        Effect.mapError(unavailable("Failed to load user guild permissions")),
      );
  },
);

export const getGuildByIdOrVanityUrl = Effect.fn("getGuildByIdOrVanityUrl")(
  function* ({ idOrVanityUrl }: { readonly idOrVanityUrl: string }) {
    const data = yield* InternalGuildsData;

    const guild = yield* data
      .getGuild(idOrVanityUrl)
      .pipe(Effect.mapError(unavailable("Failed to look up guild")));

    if (guild === null) {
      return yield* new RpcNotFoundError({ message: "Guild not found" });
    }

    return yield* Schema.decodeUnknownEffect(RpcGuildLookup)(guild).pipe(
      Effect.mapError(unavailable("Invalid guild lookup payload")),
    );
  },
);

export const getMemberIdentity = Effect.fn("getMemberIdentity")(function* ({
  guildId,
  discordId,
}: {
  readonly guildId: string;
  readonly discordId: string;
}) {
  const data = yield* InternalGuildsData;

  const identity = yield* data
    .getMemberIdentity(guildId, discordId)
    .pipe(Effect.mapError(unavailable("Failed to resolve member identity")));

  if (identity === null) {
    return yield* new RpcNotFoundError({ message: "Member not found" });
  }

  return yield* Schema.decodeEffect(InternalMemberIdentityResponse)(
    identity,
  ).pipe(Effect.mapError(unavailable("Invalid member identity payload")));
});
