import {
  RabbitMessaging,
  type RabbitMessagingService,
} from "@lootlog/messaging";
import { AuthRpcGroup } from "@lootlog/rpc/auth";
import {
  type RpcUnauthorizedError,
  RpcUnavailableError,
} from "@lootlog/rpc/errors";
import { serviceRpcRoutes } from "@lootlog/rpc/server";
import { DISCORD_AUTH_SCOPES } from "@lootlog/schema/discord";
import { Permission } from "@lootlog/schema/permissions";
import { BunHttpServer, BunRedis } from "@effect/platform-bun";
import { Effect, Layer, ManagedRuntime } from "effect";
import { FetchHttpClient, HttpRouter, HttpServer } from "effect/http";
import { Redis } from "effect/persistence";
import { count, isNull, sql } from "drizzle-orm";
import { fingerprintAccessToken } from "#src/auth/auth.service";
import { makeRedisService, type RedisService } from "#src/redis/redis.service";
import { getRejectedAuthTokenKey } from "#src/shared/cache";
import { LootlogApiRouter } from "../src/runtime/application/http-routes.js";
import { ApiRedis } from "../src/runtime/infrastructure/api-redis.js";
import { ApiRuntimeConfig } from "../src/runtime/infrastructure/api-runtime-config.js";
import {
  ApiDatabase,
  ApiDatabaseLive,
  type ApiDatabaseValue,
} from "../src/database/drizzle/database.js";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "../src/database/drizzle/organization.schema.js";
import { timerTable } from "../src/database/drizzle/timer.schema.js";

export const caller = {
  userId: "user-1",
  discordId: "discord-1",
} as const;

export const authorizedGuildId = "guild-authorized";

export const forbiddenGuildId = "guild-forbidden";

export const world = "aldous";

export const headers = {
  authorization: "Bearer validated-by-forward-auth",
  "content-type": "application/json",
  "x-auth-user-id": caller.userId,
  "x-auth-discord-id": caller.discordId,
};

export type AuthIdpTokenResult = Effect.Effect<
  {
    readonly accessToken: string;
    readonly expiresIn: number;
    readonly scopes: ReadonlyArray<string>;
  },
  RpcUnauthorizedError | RpcUnavailableError
>;

export const createHttpBoundaryContext = () => {
  const publishedMessages: Parameters<RabbitMessagingService["publish"]>[0][] =
    [];

  const rabbitBoundary: RabbitMessagingService = {
    publish: (message) =>
      Effect.sync(() => {
        publishedMessages.push(message);
      }),
    consume: () => Effect.never,
    ack: () => Effect.void,
    nack: () => Effect.void,
  };

  let authServiceAnswer: (() => AuthIdpTokenResult) | null = null;

  const authRpcBoundary = HttpRouter.toWebHandler(
    Layer.mergeAll(
      serviceRpcRoutes({
        group: AuthRpcGroup,
        handlers: AuthRpcGroup.toLayer({
          getIdpToken: () =>
            authServiceAnswer
              ? authServiceAnswer()
              : Effect.fail(new RpcUnavailableError({ message: "No mock" })),
          listPlatformRoleHolders: () => Effect.succeed({ userIds: [] }),
          getApiKeyStatuses: () => Effect.succeed({ keys: [] }),
        }),
      }),
      HttpServer.layerServices,
    ),
    { disableLogger: true },
  );

  const fetchBoundary: typeof globalThis.fetch = Object.assign(
    (input: RequestInfo | URL, init?: RequestInit) => {
      const req = new Request(input, init);

      if (req.url === "http://auth.test/rpc") {
        return authRpcBoundary.handler(req);
      }

      return globalThis.fetch(input, init);
    },
    { preconnect: globalThis.fetch.preconnect },
  );

  const RuntimeBoundaries = Layer.mergeAll(
    ApiRuntimeConfig.layer,
    ApiRedis.layer.pipe(Layer.provide(ApiRuntimeConfig.layer)),
    Layer.succeed(RabbitMessaging, RabbitMessaging.of(rabbitBoundary)),
    FetchHttpClient.layer.pipe(
      Layer.provide(Layer.succeed(FetchHttpClient.Fetch, fetchBoundary)),
    ),
  );

  const boundary = HttpRouter.toWebHandler(
    LootlogApiRouter.pipe(
      Layer.provide(RuntimeBoundaries),
      Layer.provide(BunHttpServer.layerHttpServices),
    ),
    { disableLogger: true },
  );

  const databaseRuntime = ManagedRuntime.make(ApiDatabaseLive);
  let database: ApiDatabaseValue | undefined;
  let redis: RedisService | undefined;

  let redisRuntime:
    | ManagedRuntime.ManagedRuntime<Redis.Redis, never>
    | undefined;

  const getDatabase = (): ApiDatabaseValue => {
    if (!database) {
      throw new Error("HTTP boundary database is not initialized");
    }

    return database;
  };

  const getRedis = (): RedisService => {
    if (!redis) {
      throw new Error("HTTP boundary Redis is not initialized");
    }

    return redis;
  };

  const getRedisRuntime = () => {
    if (!redisRuntime) {
      throw new Error("HTTP boundary Redis runtime is not initialized");
    }

    return redisRuntime;
  };

  const request = (path: string, init?: RequestInit) =>
    boundary.handler(
      new Request(`http://api.test${path}`, {
        ...init,
        headers: { ...headers, ...init?.headers },
      }),
    );

  const rawRequest = (req: Request) => boundary.handler(req);

  const setAuthServiceAnswer = (answer: (() => AuthIdpTokenResult) | null) => {
    authServiceAnswer = answer;
  };

  const issueRevokedDiscordToken = async (identity: {
    readonly userId: string;
    readonly discordId: string;
  }) => {
    authServiceAnswer = () =>
      Effect.succeed({
        accessToken: "revoked-token",
        expiresIn: 3_600,
        scopes: DISCORD_AUTH_SCOPES,
      });
    await Effect.runPromise(
      getRedis().set(
        getRejectedAuthTokenKey(
          identity.userId,
          identity.discordId,
          fingerprintAccessToken("revoked-token"),
        ),
        "1",
        60,
      ),
    );
  };

  const countTimers = async () =>
    (
      await databaseRuntime.runPromise(
        getDatabase()
          .select({ value: count() })
          .from(timerTable)
          .where(isNull(timerTable.deletedAt)),
      )
    )[0]?.value;

  const setup = async () => {
    database = await databaseRuntime.runPromise(ApiDatabase);
    const username = encodeURIComponent(process.env.REDIS_USERNAME ?? "");
    const password = encodeURIComponent(process.env.REDIS_PASSWORD ?? "");
    redisRuntime = ManagedRuntime.make(
      BunRedis.layer({
        url: `redis://${username}:${password}@${process.env.REDIS_HOST ?? "127.0.0.1"}:${Number(process.env.REDIS_PORT ?? 6379)}`,
      }),
    );
    redis = makeRedisService(await redisRuntime.runPromise(Redis.Redis));
  };

  const reset = async () => {
    publishedMessages.length = 0;
    authServiceAnswer = null;
    await getRedisRuntime().runPromise(
      Effect.flatMap(Redis.Redis, (client) => client.send("FLUSHALL")),
    );
    const db = getDatabase();
    await databaseRuntime.runPromise(
      Effect.gen(function* () {
        yield* db.execute(sql`TRUNCATE TABLE "Guild" RESTART IDENTITY CASCADE`);
        const updatedAt = new Date();
        yield* db.insert(guildTable).values([
          {
            id: authorizedGuildId,
            name: "Authorized Organization",
            ownerId: "different-owner",
            updatedAt,
          },
          {
            id: forbiddenGuildId,
            name: "Forbidden Organization",
            ownerId: "different-owner",
            updatedAt,
          },
        ]);
        yield* db.insert(roleTable).values({
          id: "timer-maintainer",
          guildId: authorizedGuildId,
          name: "Timer maintainer",
          updatedAt,
          permissions: [
            Permission.ADMIN,
            Permission.LOOTLOG_EVENTS_READ,
            Permission.LOOTLOG_TIMERS_READ,
            Permission.LOOTLOG_TIMERS_WRITE,
            Permission.LOOTLOG_MANAGE,
          ],
        });

        const members = yield* db
          .insert(memberTable)
          .values([
            {
              userId: caller.discordId,
              globalUserId: caller.userId,
              guildId: authorizedGuildId,
              name: "Authorized member",
              lastDiscordSyncAt: updatedAt,
              updatedAt,
            },
            {
              userId: caller.discordId,
              globalUserId: caller.userId,
              guildId: forbiddenGuildId,
              name: "Member without timer permissions",
              lastDiscordSyncAt: updatedAt,
              updatedAt,
            },
          ])
          .returning();

        const authorizedMember = members.find(
          (member) => member.guildId === authorizedGuildId,
        );

        if (!authorizedMember)
          throw new Error("Authorized member was not created");
        yield* db
          .insert(memberToRoleTable)
          .values({ A: authorizedMember.id, B: "timer-maintainer" });
      }),
    );
  };

  const teardown = async () => {
    await redisRuntime?.dispose();
    await databaseRuntime.dispose();
    await boundary.dispose();
    await authRpcBoundary.dispose();
  };

  return {
    publishedMessages,
    databaseRuntime,
    get database() {
      return getDatabase();
    },
    get redis() {
      return getRedis();
    },
    request,
    rawRequest,
    setAuthServiceAnswer,
    issueRevokedDiscordToken,
    countTimers,
    setup,
    reset,
    teardown,
  };
};
