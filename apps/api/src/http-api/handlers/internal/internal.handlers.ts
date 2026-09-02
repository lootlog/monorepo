import { Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { resolveReservationSettings } from "@lootlog/domain/reservations";
import { Permission } from "@lootlog/schema/permissions";
import type { GuildsService } from "#src/guilds/guilds.service";
import type { GuildsRepository } from "#src/guilds/guilds.repository";
import type { MembersRepository } from "#src/members/members.repository";
import type { RedisService } from "#src/redis/redis.service";
import {
  getGuildCacheKey,
  GUILD_CACHE_TTL_SECONDS,
} from "#src/shared/constants/cache.constant";
import {
  GuildsInternalControllerGetGuildByIdOrVanityUrl200,
  GuildsInternalControllerGetUserPermissions200,
  LootlogApi,
} from "../../lootlog-api.generated.js";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class InternalGuildsOperationError extends Schema.TaggedError<InternalGuildsOperationError>()(
  "InternalGuildsOperationError",
  { cause: Schema.Defect() },
) {}

export class InternalGuildsData extends Context.Service<
  InternalGuildsData,
  {
    readonly getUserPermissions: (
      discordId: string,
      userId: string,
    ) => Effect.Effect<unknown, InternalGuildsOperationError>;
    readonly getGuild: (
      idOrVanityUrl: string,
    ) => Effect.Effect<unknown, InternalGuildsOperationError>;
  }
>()("@lootlog/api/http-api/internal-guilds/data") {
  static layerService(service: GuildsService) {
    const attempt = (operation: () => unknown | PromiseLike<unknown>) =>
      Effect.tryPromise({
        try: () => Promise.resolve(operation()),
        catch: (cause) => new InternalGuildsOperationError({ cause }),
      });
    return Layer.succeed(
      InternalGuildsData,
      InternalGuildsData.of({
        getUserPermissions: (discordId, userId) =>
          attempt(() =>
            service.getUserGuildsWithPermissions(discordId, userId),
          ),
        getGuild: (idOrVanityUrl) =>
          attempt(() => service.getGuildById(idOrVanityUrl)),
      }),
    );
  }

  static makeRepositories(options: {
    readonly guilds: GuildsRepository;
    readonly members: MembersRepository;
    readonly redis: RedisService;
  }): InternalGuildsData["Service"] {
    const attempt = <A>(operation: () => Promise<A>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new InternalGuildsOperationError({ cause }),
      });

    const getGuild = async (idOrVanityUrl: string) => {
      const cacheKey = getGuildCacheKey(idOrVanityUrl);
      const cached = await options.redis.get(cacheKey);
      if (cached) {
        try {
          const guild = JSON.parse(cached) as Record<string, unknown>;
          return { ...guild, ...resolveReservationSettings(guild) };
        } catch {
          await options.redis.del(cacheKey);
        }
      }

      const guild = await options.guilds.findActive(idOrVanityUrl);
      if (!guild) throw new Error("Guild not found");
      const encoded = JSON.stringify(guild);
      await Promise.all([
        options.redis.set(
          getGuildCacheKey(guild.id),
          encoded,
          GUILD_CACHE_TTL_SECONDS,
        ),
        ...(guild.vanityUrl
          ? [
              options.redis.set(
                getGuildCacheKey(guild.vanityUrl),
                encoded,
                GUILD_CACHE_TTL_SECONDS,
              ),
            ]
          : []),
      ]);
      return { ...guild, ...resolveReservationSettings(guild) };
    };

    const getUserPermissions = async (discordId: string, userId: string) => {
      const cacheKey = `user:${userId}:discord:${discordId}:guild-permissions`;
      const cached = await options.redis.getJson<unknown[]>(cacheKey);
      if (cached !== null) return cached;

      const guilds = await options.guilds.findForPermissions(discordId, [
        Permission.LOOTLOG_ACCESS,
      ]);
      if (guilds.length === 0) return [];
      const members = await options.members.findMembersByUserGuildIds(
        discordId,
        guilds.map(({ id }) => id),
      );
      const memberByGuild = new Map(
        members.map((member) => [member.guildId, member]),
      );
      const allPermissions = Object.values(Permission);
      const result = guilds.flatMap((guild) => {
        if (guild.ownerId === discordId) {
          return [
            {
              guild: { id: guild.id, ownerId: guild.ownerId },
              roles: [
                {
                  id: "owner",
                  lvlRangeFrom: 0,
                  lvlRangeTo: 999,
                  permissions: allPermissions,
                },
              ],
            },
          ];
        }
        const member = memberByGuild.get(guild.id);
        if (
          !member?.active ||
          !member.roles.some((role) =>
            role.permissions.includes(Permission.LOOTLOG_ACCESS),
          )
        ) {
          return [];
        }
        return [
          {
            guild: { id: guild.id, ownerId: guild.ownerId },
            roles: member.roles
              .filter(({ permissions }) => permissions.length > 0)
              .map(({ id, lvlRangeFrom, lvlRangeTo, permissions }) => ({
                id,
                lvlRangeFrom,
                lvlRangeTo,
                permissions,
              })),
          },
        ];
      });
      await options.redis.setJson(cacheKey, result, 60);
      return result;
    };

    return InternalGuildsData.of({
      getUserPermissions: (discordId, userId) =>
        attempt(() => getUserPermissions(discordId, userId)),
      getGuild: (idOrVanityUrl) => attempt(() => getGuild(idOrVanityUrl)),
    });
  }
}

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(JSON.parse(JSON.stringify(value))).pipe(
    Effect.mapError((cause) => new InternalGuildsOperationError({ cause })),
  );

export const getInternalUserPermissions = (discordId: string, userId: string) =>
  Effect.gen(function* () {
    if (discordId.length === 0 || userId.length === 0) return [];
    const data = yield* InternalGuildsData;
    return yield* Effect.flatMap(
      data.getUserPermissions(discordId, userId),
      (value) => decode(GuildsInternalControllerGetUserPermissions200, value),
    );
  });

export const getInternalGuild = (idOrVanityUrl: string) =>
  Effect.gen(function* () {
    const data = yield* InternalGuildsData;
    return yield* Effect.flatMap(data.getGuild(idOrVanityUrl), (value) =>
      decode(GuildsInternalControllerGetGuildByIdOrVanityUrl200, value),
    );
  });

const orDieHttpFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) =>
    Effect.die(
      error instanceof InternalGuildsOperationError ? error.cause : error,
    ),
  );

export const InternalGuildsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "internal",
  (handlers) =>
    handlers
      .handle("GuildsInternalControllerGetUserPermissions", ({ query }) =>
        orDieHttpFailure(
          getInternalUserPermissions(query.discordId, query.userId),
        ),
      )
      .handle("GuildsInternalControllerGetGuildByIdOrVanityUrl", ({ params }) =>
        orDieHttpFailure(getInternalGuild(params.idOrVanityUrl)),
      ),
);
