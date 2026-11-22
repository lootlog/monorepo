import { reconnectingBunRedisLayer } from "@lootlog/database/bun-redis";
import {
  Permission,
  UserGuildPermissionsDtoSchema,
} from "@lootlog/schema/permissions";
import { INTERNAL_USER_PERMISSIONS_PATH } from "@lootlog/schema/internal-guilds";
import { Context, Effect, Layer, Redacted, Schema } from "effect";
import { Redis } from "effect/persistence";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { ActivityConfig } from "#src/config/activity-config";
import {
  ApiHttpClient,
  type ApiHttpClientFailure,
} from "#src/http/api-http-client";

const UserPermissions = Schema.Array(UserGuildPermissionsDtoSchema);

class PermissionsUnavailable extends TaggedErrorClass<PermissionsUnavailable>()(
  "PermissionsUnavailable",
  {
    operation: Schema.Literals([
      "guild-cache-read",
      "guild-cache-write",
      "guild-response",
      "permissions-response",
    ]),
    status: Schema.optional(Schema.Number),
    cause: Schema.optional(Schema.Defect()),
  },
) {}

export interface PermissionsValue {
  readonly resolveGuildId: (
    id: string,
  ) => Effect.Effect<
    string | null,
    PermissionsUnavailable | ApiHttpClientFailure
  >;
  readonly getUserCapabilities: (
    discordId: string,
    userId: string,
  ) => Effect.Effect<
    (guildId: string) => Permission[],
    PermissionsUnavailable | ApiHttpClientFailure
  >;
}

export class Permissions extends Context.Service<
  Permissions,
  PermissionsValue
>()("@lootlog/activity/Permissions") {
  static readonly layer = Layer.effect(
    Permissions,
    Effect.gen(function* () {
      const config = yield* ActivityConfig;
      const apiHttpClient = yield* ApiHttpClient;

      const memory = new Map<string, { value: string }>();

      const redis = yield* Redis.Redis;

      if (config.redisUrl) {
        yield* redis
          .send("PING")
          .pipe(
            Effect.mapError(
              (cause) => new Error("Redis connection failed", { cause }),
            ),
          );
      }

      const get = <A>(
        key: string,
        schema: Schema.Codec<A>,
      ): Effect.Effect<
        A | undefined,
        Redis.RedisError | Schema.SchemaError
      > => {
        if (config.redisUrl) {
          return redis
            .send<string | null>("GET", key)
            .pipe(
              Effect.flatMap((value) =>
                value
                  ? Schema.decodeUnknownEffect(Schema.fromJsonString(schema))(
                      value,
                    )
                  : Effect.succeed(undefined),
              ),
            );
        }

        const entry = memory.get(key);

        return entry
          ? Schema.decodeUnknownEffect(schema)(entry.value)
          : Effect.succeed(undefined);
      };

      const set = (
        key: string,
        value: string,
      ): Effect.Effect<void, Redis.RedisError> => {
        if (config.redisUrl) {
          return redis
            .send("SET", key, JSON.stringify(value), "PX", "300000")
            .pipe(Effect.asVoid);
        }

        return Effect.sync(() => {
          memory.set(key, { value });
        });
      };

      const decodeGuild = Schema.decodeUnknownEffect(
        Schema.fromJsonString(Schema.Struct({ id: Schema.NonEmptyString })),
      );

      const decodePermissions = Schema.decodeUnknownEffect(
        Schema.fromJsonString(UserPermissions),
      );

      const resolveGuildId = Effect.fn("Permissions.resolveGuildId")(function* (
        id: string,
      ) {
        const key = `guild-id:${id}`;

        const cached = yield* get(key, Schema.String).pipe(
          Effect.mapError(
            (cause) =>
              new PermissionsUnavailable({
                operation: "guild-cache-read",
                cause,
              }),
          ),
        );

        if (cached) return cached;

        const response = yield* apiHttpClient.get(
          "Permissions.resolveGuildId",
          `${config.apiServiceUrl}/internal/guilds/${encodeURIComponent(id)}`,
        );

        if (response.status === 404) return null;

        if (response.status < 200 || response.status >= 300)
          return yield* new PermissionsUnavailable({
            operation: "guild-response",
            status: response.status,
          });

        const guild = yield* decodeGuild(
          new TextDecoder().decode(response.body),
        ).pipe(
          Effect.mapError(
            (cause) =>
              new PermissionsUnavailable({
                operation: "guild-response",
                status: response.status,
                cause,
              }),
          ),
        );

        yield* set(key, guild.id).pipe(
          Effect.mapError(
            (cause) =>
              new PermissionsUnavailable({
                operation: "guild-cache-write",
                cause,
              }),
          ),
        );

        return guild.id;
      });

      const getUserPermissions = Effect.fn("Permissions.getUserPermissions")(
        function* (discordId: string, userId: string) {
          const url = new URL(
            INTERNAL_USER_PERMISSIONS_PATH,
            config.apiServiceUrl,
          );

          url.searchParams.set("discordId", discordId);
          url.searchParams.set("userId", userId);

          const permissions = yield* apiHttpClient
            .get("Permissions.getUserPermissions", url)
            .pipe(
              Effect.flatMap((response) => {
                if (response.status < 200 || response.status >= 300) {
                  return Effect.fail(
                    new PermissionsUnavailable({
                      operation: "permissions-response",
                      status: response.status,
                    }),
                  );
                }

                return decodePermissions(
                  new TextDecoder().decode(response.body),
                ).pipe(
                  Effect.mapError(
                    (cause) =>
                      new PermissionsUnavailable({
                        operation: "permissions-response",
                        status: response.status,
                        cause,
                      }),
                  ),
                );
              }),
            );

          return permissions;
        },
      );

      const getUserCapabilities = (discordId: string, userId: string) =>
        getUserPermissions(discordId, userId).pipe(
          Effect.map((grants) => (guildId: string): Permission[] => {
            const guild = grants.find((entry) => entry.guild.id === guildId);

            if (!guild) return [];

            if (guild.guild.ownerId === discordId)
              return Object.values(Permission);

            return [
              ...new Set(guild.roles.flatMap((role) => role.permissions)),
            ];
          }),
        );

      return Permissions.of({ resolveGuildId, getUserCapabilities });
    }),
  );

  static readonly live = Layer.unwrap(
    Effect.map(ActivityConfig, (config) =>
      Permissions.layer.pipe(
        Layer.provide(
          reconnectingBunRedisLayer({
            url: config.redisUrl
              ? Redacted.value(config.redisUrl)
              : "redis://localhost:6379",
          }),
        ),
      ),
    ),
  );
}
