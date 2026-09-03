import {
  Permission,
  UserGuildPermissionsDtoSchema,
  type UserGuildPermissionsDto,
} from "@lootlog/schema/permissions";
import { Context, Effect, Layer, Redacted, Schema } from "effect";
import { Redis } from "ioredis";
import { ActivityConfig } from "#src/config/activity-config";
import { ApiHttpClient } from "#src/http/api-http-client";

export interface PermissionsValue {
  readonly resolveGuildId: (id: string) => Effect.Effect<string | null, Error>;
  readonly getUserGuildPermissions: (
    discordId: string,
    userId: string,
    guildId: string,
  ) => Effect.Effect<Permission[]>;
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
      const memory = new Map<string, { expiresAt: number; value: unknown }>();
      const redis = config.redisUrl
        ? yield* Effect.acquireRelease(
            Effect.sync(
              () =>
                new Redis(Redacted.value(config.redisUrl!), {
                  lazyConnect: true,
                }),
            ),
            (client) =>
              Effect.tryPromise(() => client.quit()).pipe(Effect.ignore),
          )
        : undefined;
      if (redis)
        yield* Effect.tryPromise({
          try: () => redis.connect(),
          catch: (cause) => new Error("Redis connection failed", { cause }),
        });
      const get = async <A>(
        key: string,
        decodeValue: (value: unknown) => A,
        decodeJson: (value: string) => A,
      ): Promise<A | undefined> => {
        if (redis) {
          const value = await redis.get(key);
          return value ? decodeJson(value) : undefined;
        }
        const entry = memory.get(key);
        return entry ? decodeValue(entry.value) : undefined;
      };
      const set = async (key: string, value: unknown): Promise<void> => {
        if (redis) {
          await redis.set(key, JSON.stringify(value), "PX", 300_000);
          return;
        }
        memory.set(key, { value, expiresAt: Number.POSITIVE_INFINITY });
      };
      const decodeGuild = Schema.decodeUnknownSync(
        Schema.Struct({ id: Schema.NonEmptyString }),
      );
      const decodePermissions = Schema.decodeUnknownSync(
        Schema.Array(UserGuildPermissionsDtoSchema),
      );
      const decodeString = Schema.decodeUnknownSync(Schema.String);
      const decodeStringJson = Schema.decodeUnknownSync(
        Schema.fromJsonString(Schema.String),
      );
      const decodePermissionsJson = Schema.decodeUnknownSync(
        Schema.fromJsonString(Schema.Array(UserGuildPermissionsDtoSchema)),
      );
      const resolveGuildId = Effect.fn("Permissions.resolveGuildId")(function* (
        id: string,
      ) {
        const key = `guild-id:${id}`;
        const cached = yield* Effect.tryPromise({
          try: () => get(key, decodeString, decodeStringJson),
          catch: (cause) => new Error("Guild cache read failed", { cause }),
        });
        if (cached) return cached;
        const response = yield* apiHttpClient.get(
          "Permissions.resolveGuildId",
          `${config.apiServiceUrl}/internal/guilds/${encodeURIComponent(id)}`,
        );
        if (response.status === 404) return null;
        if (response.status < 200 || response.status >= 300)
          return yield* Effect.fail(
            new Error(`Guild resolution failed with ${response.status}`),
          );
        const guild = yield* Effect.try({
          try: () =>
            decodeGuild(
              Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Unknown))(
                new TextDecoder().decode(response.body),
              ),
            ),
          catch: (cause) => new Error("Guild response was invalid", { cause }),
        });
        yield* Effect.tryPromise({
          try: () => set(key, guild.id),
          catch: (cause) => new Error("Guild cache write failed", { cause }),
        });
        return guild.id;
      });
      const getUserPermissions = Effect.fn("Permissions.getUserPermissions")(
        function* (discordId: string, userId: string) {
          const key = `permissions:${userId}:${discordId}`;
          const cached = yield* Effect.tryPromise({
            try: () => get(key, decodePermissions, decodePermissionsJson),
            catch: (cause) =>
              new Error("Permissions cache read failed", { cause }),
          }).pipe(Effect.catch(() => Effect.succeed(undefined)));
          if (cached) return cached;
          const url = new URL(
            "/internal/guilds/user-permissions",
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
                    new Error(
                      `Permissions request failed with ${response.status}`,
                    ),
                  );
                }
                return Effect.try({
                  try: () =>
                    decodePermissions(
                      Schema.decodeUnknownSync(
                        Schema.fromJsonString(Schema.Unknown),
                      )(new TextDecoder().decode(response.body)),
                    ),
                  catch: (cause) =>
                    new Error("Permissions response was invalid", { cause }),
                });
              }),
            )
            .pipe(
              Effect.catch(() =>
                Effect.succeed([] as UserGuildPermissionsDto[]),
              ),
            );
          yield* Effect.tryPromise({
            try: () => set(key, permissions),
            catch: (cause) =>
              new Error("Permissions cache write failed", { cause }),
          }).pipe(Effect.ignore);
          return permissions;
        },
      );
      const getUserGuildPermissions = Effect.fn(
        "Permissions.getUserGuildPermissions",
      )(function* (discordId: string, userId: string, guildId: string) {
        const grants = yield* getUserPermissions(discordId, userId);
        const guild = grants.find((entry) => entry.guild.id === guildId);
        if (!guild) return [];
        if (guild.guild.ownerId === discordId) return Object.values(Permission);
        return [...new Set(guild.roles.flatMap((role) => role.permissions))];
      });
      return Permissions.of({ resolveGuildId, getUserGuildPermissions });
    }),
  );
}
