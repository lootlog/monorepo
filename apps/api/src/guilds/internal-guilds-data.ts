import {
  readGuildConfigurationCache,
  writeGuildConfigurationCache,
  type GuildConfigurationCache,
} from "./guild-configuration-cache.js";
import {
  makeUserGuildPermissionsPersistence,
  makeUserGuildPermissionsProjection,
  type UserGuildPermissionsCache,
  type UserGuildPermissionsPersistence,
} from "#src/members/user-guild-permissions";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Layer, Schema } from "effect";
import { resolveReservationSettings } from "@lootlog/domain/reservations";
import { ApiDatabase } from "#src/database/drizzle/database";
import { findActiveGuild } from "./active-guild-lookup.js";
import type { guildTable } from "#src/database/drizzle/organization.schema";
import { findActiveGuildMember } from "#src/members/member-access-query";
import type { UserOrganizationPermissionsResponse } from "#src/contracts/guilds/schemas";

export class InternalMemberNotFound extends TaggedErrorClass<InternalMemberNotFound>()(
  "InternalMemberNotFound",
  { status: Schema.Literal(404), code: Schema.Literal("MEMBER_NOT_FOUND") },
) {}

export class InternalGuildNotFound extends TaggedErrorClass<InternalGuildNotFound>()(
  "InternalGuildNotFound",
  { status: Schema.Literal(404), code: Schema.Literal("GUILD_NOT_FOUND") },
) {}

export class InternalGuildsOperationError extends TaggedErrorClass<InternalGuildsOperationError>()(
  "InternalGuildsOperationError",
  { cause: Schema.Defect() },
) {}

export type InternalGuildsCache = UserGuildPermissionsCache &
  GuildConfigurationCache;

type GuildRecord = typeof guildTable.$inferSelect;

export interface MemberIdentity {
  readonly userId: string;
  readonly memberId: number;
}

export interface InternalGuildsPersistence extends UserGuildPermissionsPersistence {
  readonly findActiveGuild: (
    idOrVanityUrl: string,
  ) => Effect.Effect<GuildRecord | null, unknown>;
  readonly findActiveMemberIdentity: (
    guildId: string,
    discordId: string,
  ) => Effect.Effect<MemberIdentity | null, unknown>;
}

export const makeInternalGuildsData = (
  persistence: InternalGuildsPersistence,
  cache: InternalGuildsCache,
) => {
  const operation = <A, E>(effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError((cause) => new InternalGuildsOperationError({ cause })),
    );

  const getGuild = (idOrVanityUrl: string) =>
    Effect.gen(function* () {
      const cached = yield* readGuildConfigurationCache(cache, idOrVanityUrl);

      if (cached) return cached;

      const guild = yield* persistence.findActiveGuild(idOrVanityUrl);

      if (!guild) return null;

      yield* writeGuildConfigurationCache(cache, idOrVanityUrl, guild);

      return { ...guild, ...resolveReservationSettings(guild) };
    });

  const getUserPermissions = makeUserGuildPermissionsProjection(
    persistence,
    cache,
  );

  return InternalGuildsData.of({
    getUserPermissions: (discordId, userId, freshness) =>
      operation(getUserPermissions(discordId, userId, freshness)),
    getGuild: (idOrVanityUrl) => operation(getGuild(idOrVanityUrl)),
    getMemberIdentity: (guildId, discordId) =>
      operation(persistence.findActiveMemberIdentity(guildId, discordId)),
  });
};

export class InternalGuildsData extends Context.Service<
  InternalGuildsData,
  {
    readonly getUserPermissions: (
      discordId: string,
      userId: string,
      freshness?: "required",
    ) => Effect.Effect<
      UserOrganizationPermissionsResponse,
      InternalGuildsOperationError
    >;
    readonly getGuild: (
      idOrVanityUrl: string,
    ) => Effect.Effect<
      | NonNullable<
          Effect.Success<ReturnType<typeof readGuildConfigurationCache>>
        >
      | (GuildRecord & ReturnType<typeof resolveReservationSettings>)
      | null,
      InternalGuildsOperationError
    >;
    readonly getMemberIdentity: (
      guildId: string,
      discordId: string,
    ) => Effect.Effect<MemberIdentity | null, InternalGuildsOperationError>;
  }
>()("@lootlog/api/http-api/internal-guilds/data") {
  static layerDatabase(cache: InternalGuildsCache) {
    return Layer.effect(
      InternalGuildsData,
      Effect.map(ApiDatabase, (database) => {
        const persistence: InternalGuildsPersistence = {
          findActiveGuild: (idOrVanityUrl) =>
            findActiveGuild(database, idOrVanityUrl),
          findActiveMemberIdentity: (guildId, discordId) =>
            findActiveGuildMember(database, discordId, guildId).pipe(
              Effect.map((member) =>
                member?.globalUserId
                  ? { userId: member.globalUserId, memberId: member.id }
                  : null,
              ),
            ),
          ...makeUserGuildPermissionsPersistence(database),
        };

        return makeInternalGuildsData(persistence, cache);
      }),
    );
  }
}
