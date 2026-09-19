import { HttpClient, HttpClientResponse } from "effect/unstable/http";
import { Redis } from "effect/unstable/persistence";
import { ApiKeyService } from "#src/auth/api-key-service";
import { AppConfig } from "#src/config/env";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { PgClient } from "@effect/sql-pg";
import { makeAuthPostgresLayer, PostgresPool } from "./postgres.js";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import {
  GenericContainer,
  Wait,
  type StartedTestContainer,
} from "testcontainers";
import {
  AuthRedisStorage,
  createAuthRedisConnection,
} from "#src/auth/storage/auth-redis-storage";
import { drizzle } from "drizzle-orm/node-postgres";
import { Effect, Layer, Logger, ManagedRuntime, Redacted } from "effect";
import {
  createLootlogAuth,
  BetterAuthRuntime,
} from "#src/auth/provider/better-auth";
import { AuthDatabase } from "./drizzle.js";
import { authUsers, authApiKeys } from "./drizzle.schema.js";
import { runAuthMigrations } from "./migrations.js";

describe("Better Auth and Effect PostgreSQL interoperability", () => {
  let postgres: StartedPostgreSqlContainer;
  let redis: StartedTestContainer;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer("postgres:17-alpine").start();
    redis = await new GenericContainer("redis:7-alpine")
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();
  }, 60_000);

  afterAll(async () => {
    await postgres?.stop();
    await redis?.stop();
  });

  it("shares committed users and sessions and rolls back failed adapter transactions", async () => {
    const runtime = ManagedRuntime.make(
      AuthDatabase.layer.pipe(
        Layer.provideMerge(
          makeAuthPostgresLayer({
            url: Redacted.make(postgres.getConnectionUri()),
            applicationName: "auth-adapter-test",
            maxConnections: 2,
          }),
        ),
      ),
    );

    const pool = await runtime.runPromise(PostgresPool);

    try {
      const client = await runtime.runPromise(PgClient.PgClient);
      const db = await runtime.runPromise(AuthDatabase);
      await runtime.runPromise(runAuthMigrations(db, client));

      const options = {
        database: drizzle({ client: pool }),
        config: {
          environment: "local",
          port: 4000,
          serviceName: "auth-adapter-test",
          appUrl: "https://auth.example.test",
          trustedOrigins: ["https://example.test"],
          cookieDomain: ".example.test",
          cookiePrefix: "test",
          adminAccountIds: [],
          authSecret: Redacted.make(
            "integration-only-secret-01234567890123456789",
          ),
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
          redis: {
            host: "unused",
            port: 6379,
            username: "",
            password: Redacted.make(""),
          },
          serviceNamespace: "test",
          commitSha: undefined,
        },
      };

      const auth = createLootlogAuth(options);
      const { adapter, internalAdapter } = await auth.$context;
      const createdAt = new Date("2026-01-02T03:04:05.123Z");

      const user = await adapter.create<typeof authUsers.$inferSelect>({
        model: "user",
        data: {
          name: "Adapter user",
          banExpires: null,
          banReason: null,
          banned: false,
          image: null,
          role: "user",
          email: "adapter@example.test",
          emailVerified: true,
          discordId: "discord-test",
          createdAt,
          updatedAt: createdAt,
        },
      });

      expect(
        await runtime.runPromise(
          db.select().from(authUsers).where(eq(authUsers.id, user.id)),
        ),
      ).toMatchObject([
        {
          id: user.id,
          name: "Adapter user",
          discordId: "discord-test",
          createdAt,
        },
      ]);

      await runtime.runPromise(
        db.transaction((tx) =>
          tx
            .update(authUsers)
            .set({ name: "Effect update" })
            .where(eq(authUsers.id, user.id)),
        ),
      );
      expect(
        await adapter.findOne({
          model: "user",
          where: [{ field: "id", value: user.id }],
        }),
      ).toMatchObject({ name: "Effect update", createdAt });

      await adapter.create({
        model: "account",
        data: {
          id: "new-discord-account",
          userId: user.id,
          providerId: "discord",
          accountId: "discord-test",
          createdAt,
          updatedAt: createdAt,
        },
      });
      expect(
        (
          await pool.query(
            'SELECT "issuer" FROM "account" WHERE "accountId" = $1',
            ["discord-test"],
          )
        ).rows,
      ).toEqual([{ issuer: null }]);

      const session = await internalAdapter.createSession(user.id);
      expect(
        await auth.api.getSession({
          headers: new Headers({ authorization: `Bearer ${session.token}` }),
        }),
      ).toMatchObject({
        user: { id: user.id, name: "Effect update", discordId: "discord-test" },
        session: { userId: user.id },
      });

      await expect(
        adapter.transaction(async (tx) => {
          await tx.update({
            model: "user",
            where: [{ field: "id", value: user.id }],
            update: { name: "Must roll back" },
          });
          throw new Error("abort adapter transaction");
        }),
      ).rejects.toThrow("abort adapter transaction");
      expect(
        await runtime.runPromise(
          db
            .select({ name: authUsers.name })
            .from(authUsers)
            .where(eq(authUsers.id, user.id)),
        ),
      ).toEqual([{ name: "Effect update" }]);
      expect(pool.totalCount).toBe(1);
      expect(
        await runtime.runPromise(
          client`SELECT count(*)::int AS count FROM pg_stat_activity WHERE application_name = 'auth-adapter-test'`,
        ),
      ).toEqual([{ count: 2 }]);
      await expect(
        runtime.runPromise(
          db.transaction((tx) =>
            Effect.gen(function* () {
              yield* tx
                .update(authUsers)
                .set({ name: "Uncommitted Effect update" })
                .where(eq(authUsers.id, user.id));

              const visible = yield* Effect.promise(() =>
                adapter.findOne({
                  model: "user",
                  where: [{ field: "id", value: user.id }],
                }),
              );

              expect(visible).toMatchObject({ name: "Effect update" });

              return yield* Effect.fail(new Error("abort Effect transaction"));
            }),
          ),
        ),
      ).rejects.toThrow("abort Effect transaction");
      expect(
        await adapter.findOne({
          model: "user",
          where: [{ field: "id", value: user.id }],
        }),
      ).toMatchObject({ name: "Effect update" });

      let grantOrganizations = [
        { id: "123", hasLootlogAccess: true, isAccessDataStale: false },
      ];

      const rateLimits = AuthRedisStorage.layer.pipe(
        Layer.provideMerge(
          createAuthRedisConnection({
            host: redis.getHost(),
            port: redis.getMappedPort(6379),
            username: "",
            password: Redacted.make(""),
          }),
        ),
      );

      const makeKeysRuntime = (apiKeysEnabled: boolean) =>
        ManagedRuntime.make(
          ApiKeyService.layer.pipe(
            Layer.provideMerge(rateLimits),
            Layer.provide(
              Layer.succeed(
                HttpClient.HttpClient,
                HttpClient.make((request) =>
                  Effect.succeed(
                    HttpClientResponse.fromWeb(
                      request,
                      Response.json(grantOrganizations),
                    ),
                  ),
                ),
              ),
            ),
            Layer.provide(Layer.succeed(AuthDatabase, db)),
            Layer.provide(
              Layer.succeed(BetterAuthRuntime, { ...auth, apiKeys: auth.api }),
            ),
            Layer.provide(
              Layer.succeed(AppConfig, {
                ...options.config,
                apiKeyStatusSecret: Redacted.make("test-status-secret"),
                apiKeysEnabled,
                apiUrl: "http://api.test",
              }),
            ),
          ),
        );

      const keysRuntime = makeKeysRuntime(true);

      try {
        const keys = await keysRuntime.runPromise(ApiKeyService);
        await expect(
          keysRuntime.runPromise(
            keys.session(
              new Headers({
                "x-api-key": "key",
                origin: "https://example.test",
              }),
            ),
          ),
        ).rejects.toMatchObject({ status: 401 });
        await expect(
          keysRuntime.runPromise(keys.session(new Headers())),
        ).rejects.toMatchObject({ status: 403 });
        grantOrganizations = [];
        await expect(
          keysRuntime.runPromise(
            keys.create(user.id, {
              name: "Future membership",
              organizationIds: ["123"],
              mode: "read",
              personalData: false,
              expiresIn: null,
            }),
          ),
        ).rejects.toMatchObject({ status: 403 });
        grantOrganizations = [
          { id: "123", hasLootlogAccess: true, isAccessDataStale: true },
        ];
        await expect(
          keysRuntime.runPromise(
            keys.create(user.id, {
              name: "Stale membership",
              organizationIds: ["123"],
              mode: "read",
              personalData: false,
              expiresIn: null,
            }),
          ),
        ).rejects.toMatchObject({ status: 403 });
        grantOrganizations = [
          { id: "123", hasLootlogAccess: true, isAccessDataStale: false },
        ];

        const key = await keysRuntime.runPromise(
          keys.create(user.id, {
            name: "Integration",
            organizationIds: ["123"],
            mode: "read",
            personalData: false,
            expiresIn: null,
          }),
        );

        expect(key.expiresAt).toBeNull();
        expect(
          (await keysRuntime.runPromise(keys.list(user.id))).keys[0],
        ).not.toHaveProperty("key");
        expect(
          await keysRuntime.runPromise(keys.verify(key.key)),
        ).toMatchObject({
          userId: user.id,
          apiKeyAccess: { organizationIds: ["123"], mode: "read" },
        });
        expect(
          await auth.api.getSession({
            headers: new Headers({ "x-api-key": key.key }),
          }),
        ).toBeNull();

        // Two auth service runtimes must share one Redis budget for this key.
        const otherRuntime = makeKeysRuntime(true);

        try {
          const otherKeys = await otherRuntime.runPromise(ApiKeyService);

          const results = await Promise.allSettled(
            Array.from({ length: 129 }, (_, index) =>
              index % 2 === 0
                ? keysRuntime.runPromise(keys.verify(key.key))
                : otherRuntime.runPromise(otherKeys.verify(key.key)),
            ),
          );

          expect(
            results.filter((result) => result.status === "fulfilled"),
          ).toHaveLength(119);

          for (const result of results) {
            if (result.status === "rejected")
              expect(result.reason).toMatchObject({ status: 429 });
          }
        } finally {
          await otherRuntime.dispose();
        }

        const rejections: Array<{ level: string; message: unknown }> = [];
        await expect(
          keysRuntime.runPromise(
            keys.verify(key.key).pipe(
              Effect.provide(
                Logger.layer([
                  Logger.make(({ logLevel, message }) => {
                    rejections.push({ level: logLevel, message });
                  }),
                ]),
              ),
            ),
          ),
        ).rejects.toMatchObject({ status: 429 });
        expect(rejections).toContainEqual({
          level: "Warn",
          message: [
            "API key rate limit exceeded",
            {
              context: "ApiKeyService",
              code: "RATE_LIMITED",
              keyId: key.id,
              userId: user.id,
              discordId: user.discordId,
            },
          ],
        });
        expect(JSON.stringify(rejections)).not.toContain(key.key);

        // A failed shared counter must not bypass enforcement or masquerade as 429.
        const redisClient = await keysRuntime.runPromise(Redis.Redis);
        await keysRuntime.runPromise(
          redisClient.send(
            "SET",
            `auth:api-key-rate-limit:${key.id}`,
            "invalid-counter",
          ),
        );
        await expect(
          keysRuntime.runPromise(keys.verify(key.key)),
        ).rejects.toMatchObject({ status: 503 });
        await keysRuntime.runPromise(
          redisClient.send("DEL", `auth:api-key-rate-limit:${key.id}`),
        );

        const stored = await runtime.runPromise(
          db.select().from(authApiKeys).where(eq(authApiKeys.id, key.id)),
        );

        expect(stored[0]?.key).not.toBe(key.key);
        await expect(
          keysRuntime.runPromise(keys.rename("another-user", key.id, "stolen")),
        ).rejects.toMatchObject({ status: 404 });
        await expect(
          keysRuntime.runPromise(keys.statuses(new Headers(), [key.id])),
        ).rejects.toMatchObject({ status: 401 });

        const statusHeaders = new Headers({
          authorization: "Bearer test-status-secret",
        });

        expect(
          await keysRuntime.runPromise(keys.statuses(statusHeaders, [key.id])),
        ).toMatchObject({ keys: [{ valid: true }] });
        await runtime.runPromise(
          db
            .update(authUsers)
            .set({ banned: true })
            .where(eq(authUsers.id, user.id)),
        );
        expect(
          await keysRuntime.runPromise(keys.statuses(statusHeaders, [key.id])),
        ).toEqual({ keys: [{ keyId: key.id, valid: false }] });
        await runtime.runPromise(
          db
            .update(authUsers)
            .set({ banned: false })
            .where(eq(authUsers.id, user.id)),
        );
        await keysRuntime.runPromise(keys.remove(user.id, key.id));
        await expect(
          keysRuntime.runPromise(keys.verify(key.key)),
        ).rejects.toMatchObject({ status: 401 });

        const attempts = await Promise.allSettled(
          Array.from({ length: 12 }, (_, index) =>
            auth.api.createApiKey({
              body: {
                userId: user.id,
                name: `Concurrent ${index}`,
                metadata: {
                  organizationIds: ["123"],
                  mode: "read",
                  personalData: false,
                },
              },
            }),
          ),
        );

        expect(
          attempts.filter(({ status }) => status === "fulfilled"),
        ).toHaveLength(10);
        const { id: _removedId, ...removedData } = user;

        const removedOwner = await adapter.create<
          typeof authUsers.$inferSelect
        >({
          model: "user",
          data: {
            ...removedData,
            email: "removed@example.test",
            discordId: "removed-discord",
          },
        });

        const disabledRuntime = makeKeysRuntime(false);

        try {
          const disabled = await disabledRuntime.runPromise(ApiKeyService);
          await expect(
            disabledRuntime.runPromise(disabled.verify("any-key")),
          ).rejects.toMatchObject({ status: 401 });
          await expect(
            disabledRuntime.runPromise(
              disabled.create(removedOwner.id, {
                name: "Disabled",
                organizationIds: ["123"],
                mode: "read",
                personalData: false,
                expiresIn: null,
              }),
            ),
          ).rejects.toMatchObject({ status: 403 });
          expect(
            await disabledRuntime.runPromise(
              disabled.statuses(statusHeaders, ["key"]),
            ),
          ).toEqual({ keys: [{ keyId: "key", valid: false }] });
        } finally {
          await disabledRuntime.dispose();
        }

        const removedKey = await keysRuntime.runPromise(
          keys.create(removedOwner.id, {
            name: "Removed owner",
            organizationIds: ["123"],
            mode: "read",
            personalData: false,
            expiresIn: null,
          }),
        );

        await runtime.runPromise(
          db.delete(authUsers).where(eq(authUsers.id, removedOwner.id)),
        );
        expect(
          await keysRuntime.runPromise(
            keys.statuses(statusHeaders, [removedKey.id]),
          ),
        ).toEqual({ keys: [{ keyId: removedKey.id, valid: false }] });
      } finally {
        await keysRuntime.dispose();
      }
    } finally {
      await runtime.dispose();
      expect(pool.ended).toBe(true);
      expect(pool.totalCount).toBe(0);
    }
  }, 30_000);
});
