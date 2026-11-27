import { ApiRpcGroup, type RpcAccessibleGuild } from "@lootlog/rpc/api";
import { makeRpcTestHttpClient, testRpcUpstream } from "@lootlog/rpc/testing";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { Effect, Layer, ManagedRuntime, Redacted } from "effect";
import type { Pool } from "pg";
import type { StartedTestContainer } from "testcontainers";
import { ApiKeyService } from "#src/auth/api-key-service";
import {
  BetterAuthRuntime,
  type createLootlogAuth,
  toAuthProvider,
} from "#src/auth/provider/better-auth";
import {
  AuthRedisStorage,
  createAuthRedisConnection,
} from "#src/auth/storage/auth-redis-storage";
import { AppConfig } from "#src/config/env";
import { AuthDatabase, type AuthDatabaseValue } from "./drizzle.js";

const unused = () => Effect.die("unused");

export const makeAuthAdapterOptions = (
  postgres: StartedPostgreSqlContainer,
  pool: Pool,
  jwksQueries: string[],
) => ({
  database: drizzle({
    client: pool,
    logger: {
      logQuery(query: string) {
        if (query.includes('"jwks"')) jwksQueries.push(query);
      },
    },
  }),
  config: {
    environment: RuntimeEnvironment.LOCAL,
    port: 4000,
    rpc: { port: 0, callerTokens: {}, api: testRpcUpstream },
    serviceName: "auth-adapter-test",
    appUrl: "https://auth.example.test",
    webAppUrl: "https://web.example.test",
    trustedOrigins: ["https://example.test"],
    cookieDomain: ".example.test",
    cookiePrefix: "test",
    adminAccountIds: [],
    authSecret: Redacted.make("integration-only-secret-01234567890123456789"),
    discordClientId: "test-discord-client",
    discordClientSecret: Redacted.make("test-discord-secret"),
    postgresql: {
      host: postgres.getHost(),
      port: postgres.getPort(),
      user: postgres.getUsername(),
      password: Redacted.make(postgres.getPassword()),
      database: postgres.getDatabase(),
      sslCa: undefined,
    },
    redisUrl: Redacted.make("redis://unused:6379"),
    serviceNamespace: "test",
    commitSha: undefined,
  },
});

export const makeApiKeysRuntimeFactory = ({
  redis,
  db,
  auth,
  config,
  getGrantOrganizations,
  getApiKeyLimit = () => 10,
}: {
  readonly redis: StartedTestContainer;
  readonly db: AuthDatabaseValue;
  readonly auth: ReturnType<typeof createLootlogAuth>;
  readonly config: ReturnType<typeof makeAuthAdapterOptions>["config"];
  readonly getGrantOrganizations: () => ReadonlyArray<RpcAccessibleGuild>;
  readonly getApiKeyLimit?: () => number;
}) => {
  const rateLimits = AuthRedisStorage.layer.pipe(
    Layer.provideMerge(
      createAuthRedisConnection(
        Redacted.make(
          `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`,
        ),
      ),
    ),
  );

  const apiRpcHttpLayer = makeRpcTestHttpClient(
    ApiRpcGroup,
    ApiRpcGroup.toLayer({
      getUserGuildPermissions: unused,
      getGuildByIdOrVanityUrl: unused,
      getMemberIdentity: unused,
      getUserAccessibleGuilds: () => Effect.succeed(getGrantOrganizations()),
      getUserLimits: () =>
        Effect.succeed({
          notificationRules: 10,
          watchedItems: 10,
          customThemes: 2,
          apiKeys: getApiKeyLimit(),
          equipmentSets: 10,
        }),
      listGuildEvents: unused,
      getEventRanking: unused,
      getEventTimers: unused,
      getEventWrapped: unused,
      listGuildTimers: unused,
      getGuildKillStats: unused,
      getGuildTopKilledNpcs: unused,
      getNpcKillers: unused,
      listGuildLoots: unused,
      listUserReservations: unused,
      listGuildReservationSpots: unused,
      getGuildStatsCard: unused,
      listGuildBingoBoards: unused,
      getGuildBingoBoard: unused,
    }),
    ["auth"],
  );

  return (apiKeysEnabled: boolean) =>
    ManagedRuntime.make(
      ApiKeyService.layer.pipe(
        Layer.provideMerge(rateLimits),
        Layer.provide(apiRpcHttpLayer),
        Layer.provide(Layer.succeed(AuthDatabase, db)),
        Layer.provide(Layer.succeed(BetterAuthRuntime, toAuthProvider(auth))),
        Layer.provide(
          Layer.succeed(AppConfig, {
            ...config,
            apiKeysEnabled,
          }),
        ),
      ),
    );
};
