import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { PgClient } from "@effect/sql-pg";
import { makePostgresLayer, PostgresPool } from "@lootlog/database";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Layer, ManagedRuntime, Redacted } from "effect";
import { createLootlogAuth } from "#src/auth/provider/better-auth";
import { AuthDatabase } from "./drizzle.js";
import { authUsers } from "./drizzle.schema.js";
import { runAuthMigrations } from "./migrations.js";

describe("Better Auth and Effect PostgreSQL interoperability", () => {
  let postgres: StartedPostgreSqlContainer;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer("postgres:17-alpine").start();
  }, 60_000);

  afterAll(async () => {
    await postgres?.stop();
  });

  it("shares committed users and sessions and rolls back failed adapter transactions", async () => {
    const runtime = ManagedRuntime.make(
      AuthDatabase.layer.pipe(
        Layer.provideMerge(
          makePostgresLayer({
            url: Redacted.make(postgres.getConnectionUri()),
            applicationName: "auth-adapter-test",
            maxConnections: 1,
          }),
        ),
      ),
    );
    try {
      const pool = await runtime.runPromise(PostgresPool);
      const client = await runtime.runPromise(PgClient.PgClient);
      const db = await runtime.runPromise(AuthDatabase);
      await runtime.runPromise(runAuthMigrations(db, client));
      const auth = createLootlogAuth({
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
      });
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
    } finally {
      await runtime.dispose();
    }
  });
});
