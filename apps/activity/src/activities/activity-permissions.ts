import { OperationError } from "@lootlog/instrumentation/operation";
import { reconnectingBunRedisLayer } from "@lootlog/database/bun-redis";
import { ApiRpcGroup } from "@lootlog/rpc/api";
import { makeRpcClient } from "@lootlog/rpc/client";
import { Permission } from "@lootlog/schema/permissions";
import { Context, Effect, Layer, Redacted, Schema } from "effect";
import { Redis } from "effect/persistence";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { ActivityConfig } from "#src/config/activity-config";

class PermissionsUnavailable extends TaggedErrorClass<
  PermissionsUnavailable,
  { readonly brand: unique symbol }
>()("PermissionsUnavailable", {
  operation: Schema.Literals([
    "guild-cache-read",
    "guild-cache-write",
    "guild-response",
    "permissions-response",
  ]),
  cause: Schema.optional(Schema.Defect()),
}) {}

export interface PermissionsValue {
  readonly resolveGuildId: (
    id: string,
  ) => Effect.Effect<string | null, PermissionsUnavailable>;
  readonly getUserCapabilities: (
    discordId: string,
    userId: string,
  ) => Effect.Effect<(guildId: string) => Permission[], PermissionsUnavailable>;
}

export class Permissions extends Context.Service<
  Permissions,
  PermissionsValue
>()("@lootlog/activity/Permissions") {
  static readonly layer = Layer.effect(
    Permissions,
    Effect.gen(function* () {
      const config = yield* ActivityConfig;

      const apiRpc = yield* makeRpcClient(ApiRpcGroup, {
        url: config.apiRpcUrl,
        spanPrefix: "activity.api-rpc",
      });

      const memory = new Map<string, { value: string }>();

      const redis = yield* Redis.Redis;

      if (config.redisUrl) {
        yield* redis
          .send("PING")
          .pipe(
            Effect.mapError(
              (cause) =>
                new OperationError({ operation: "activity.redis.ping", cause }),
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
                  ? Schema.decodeEffect(Schema.fromJsonString(schema))(value)
                  : Effect.undefined,
              ),
            );
        }

        const entry = memory.get(key);

        return entry
          ? Schema.decodeUnknownEffect(schema)(entry.value)
          : Effect.undefined;
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

        const guild = yield* apiRpc
          .getGuildByIdOrVanityUrl({ idOrVanityUrl: id })
          .pipe(
            Effect.timeout("3 seconds"),
            Effect.catchTag("RpcNotFoundError", () => Effect.succeed(null)),
            Effect.mapError(
              (cause) =>
                new PermissionsUnavailable({
                  operation: "guild-response",
                  cause,
                }),
            ),
          );

        if (!guild) return null;

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
          return yield* apiRpc
            .getUserGuildPermissions({ discordId, userId })
            .pipe(
              Effect.timeout("3 seconds"),
              Effect.mapError(
                (cause) =>
                  new PermissionsUnavailable({
                    operation: "permissions-response",
                    cause,
                  }),
              ),
            );
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
