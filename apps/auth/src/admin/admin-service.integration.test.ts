import { PgClient } from "@effect/sql-pg";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { makeSignature } from "better-auth/crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Effect, Layer, ManagedRuntime, Redacted } from "effect";
import {
  BetterAuthRuntime,
  createLootlogAuth,
  toAuthProvider,
} from "#src/auth/provider/better-auth";
import { AppConfig, type AuthConfig } from "#src/config/env";
import { AuthDatabase } from "#src/database/drizzle";
import type { authUsers } from "#src/database/drizzle.schema";
import { runAuthMigrations } from "#src/database/migrations";
import { makeAuthPostgresLayer, PostgresPool } from "#src/database/postgres";
import { AdminService } from "./admin-service.js";

const ACTOR = "Operator (operator-1)";

const SECRET = "integration-admin-secret";

const IDP_SECRET = "integration-idp-secret";

const AUTH_SECRET = "integration-only-secret-01234567890123456789";

const adminAccountIds: string[] = [];

describe("AdminService against PostgreSQL and Better Auth", () => {
  let postgres: StartedPostgreSqlContainer;

  let runtime: ManagedRuntime.ManagedRuntime<
    AdminService | AuthDatabase | PostgresPool | PgClient.PgClient,
    unknown
  >;

  let auth: ReturnType<typeof createLootlogAuth>;

  const admin = <A, E>(
    run: (service: typeof AdminService.Service) => Effect.Effect<A, E>,
  ) => runtime.runPromise(Effect.flatMap(AdminService, run));

  const createUser = async (name: string, role = "user") => {
    const { adapter } = await auth.$context;
    const now = new Date();

    return adapter.create<typeof authUsers.$inferSelect>({
      model: "user",
      data: {
        name,
        email: `${crypto.randomUUID()}@example.test`,
        emailVerified: true,
        image: null,
        role,
        banned: false,
        banReason: null,
        banExpires: null,
        discordId: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      },
    });
  };

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer("postgres:18.7-alpine").start();

    const config: AuthConfig = {
      environment: RuntimeEnvironment.LOCAL,
      port: 4000,
      serviceName: "auth-admin-test",
      appUrl: "https://auth.example.test",
      trustedOrigins: ["https://example.test"],
      cookieDomain: ".example.test",
      cookiePrefix: "test",
      adminAccountIds,
      adminApiSecret: Redacted.make(SECRET),
      idpTokenSecret: Redacted.make(IDP_SECRET),
      authSecret: Redacted.make(AUTH_SECRET),
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
    };

    const database = AuthDatabase.layer.pipe(
      Layer.provideMerge(
        makeAuthPostgresLayer({
          url: Redacted.make(postgres.getConnectionUri()),
          applicationName: "auth-admin-test",
          maxConnections: 4,
        }),
      ),
    );

    const betterAuth = Layer.effect(
      BetterAuthRuntime,
      Effect.map(PostgresPool, (pool) => {
        auth = createLootlogAuth({
          config,
          database: drizzle({ client: pool }),
        });

        return BetterAuthRuntime.of(toAuthProvider(auth));
      }),
    );

    runtime = ManagedRuntime.make(
      AdminService.layer.pipe(
        Layer.provide(betterAuth),
        Layer.provide(Layer.succeed(AppConfig, config)),
        Layer.provideMerge(database),
      ),
    );

    await runtime.runPromise(
      Effect.gen(function* () {
        yield* runAuthMigrations(yield* AuthDatabase, yield* PgClient.PgClient);
      }),
    );
  }, 60_000);

  afterAll(async () => {
    await runtime?.dispose();
    await postgres?.stop();
  });

  it("opens to an admin account's live session and closes the moment it is revoked", async () => {
    const operator = await createUser("Operator");
    const player = await createUser("Player");
    adminAccountIds.push(operator.id);

    const { internalAdapter } = await auth.$context;
    const provider = toAuthProvider(auth);

    const panelRequest = async (userId: string) => {
      const session = await internalAdapter.createSession(userId);
      const signature = await makeSignature(session.token, AUTH_SECRET);
      const cookie = encodeURIComponent(`${session.token}.${signature}`);

      return new Headers({
        authorization: `Bearer ${SECRET}`,
        cookie: `${provider.sessionCookieNames.token}=${cookie}`,
      });
    };

    const authorize = (headers: Headers) =>
      admin((service) => service.authorize(headers));

    const operatorRequest = await panelRequest(operator.id);

    expect(await authorize(operatorRequest)).toEqual({
      userId: operator.id,
      name: "Operator",
    });

    await expect(authorize(await panelRequest(player.id))).rejects.toThrow(
      "Not an admin account",
    );

    await admin((service) => service.revokeSessions(ACTOR, operator.id));

    await expect(authorize(operatorRequest)).rejects.toThrow(
      "Sign in to Lootlog first",
    );
  });

  it("ends a banned user's sessions and refuses a new one until the ban is lifted", async () => {
    const user = await createUser("Banned player");
    const { internalAdapter } = await auth.$context;
    const session = await internalAdapter.createSession(user.id);

    const banned = await admin((service) =>
      service.ban(ACTOR, user.id, { reason: "Spam", expiresAt: null }),
    );

    expect(banned.user.ban).toEqual({ reason: "Spam", expiresAt: null });
    expect(banned.user.activeSessions).toBe(0);
    expect(await internalAdapter.findSession(session.token)).toBeNull();
    await expect(internalAdapter.createSession(user.id)).rejects.toMatchObject({
      body: { code: "BANNED_USER" },
    });

    const lifted = await admin((service) => service.unban(ACTOR, user.id));

    expect(lifted.user.ban).toBeNull();
    expect(await internalAdapter.createSession(user.id)).toMatchObject({
      userId: user.id,
    });

    const { audit } = await admin((service) => service.getUser(user.id));

    expect(
      audit.map(({ actor, action, details }) => ({ actor, action, details })),
    ).toEqual([
      { actor: ACTOR, action: "ban.lift", details: null },
      {
        actor: ACTOR,
        action: "ban.set",
        details: { reason: "Spam", expiresAt: null },
      },
    ]);
  });

  it("revokes one session of a user and leaves the others", async () => {
    const user = await createUser("Two devices");
    const other = await createUser("Bystander");
    const { internalAdapter } = await auth.$context;
    const kept = await internalAdapter.createSession(user.id);
    const revoked = await internalAdapter.createSession(user.id);

    // A session id of one user is not revocable through another.
    await expect(
      admin((service) => service.revokeSession(ACTOR, other.id, revoked.id)),
    ).rejects.toThrow("Session not found");

    await admin((service) => service.revokeSession(ACTOR, user.id, revoked.id));

    expect(await internalAdapter.findSession(revoked.token)).toBeNull();
    expect(await internalAdapter.findSession(kept.token)).not.toBeNull();
  });

  it("stores several roles and finds a user by any one of them", async () => {
    const moderator = await createUser("Role holder");
    const plain = await createUser("Plain player");

    const { user } = await admin((service) =>
      service.setRoles(ACTOR, moderator.id, ["wiki-moderator", "admin"]),
    );

    expect(user.roles).toEqual(["admin", "wiki-moderator"]);

    const ids = async (
      role: "admin" | "wiki-moderator" | "global-chat-admin",
    ) =>
      (await admin((service) => service.listUsers({ role }))).users.map(
        ({ id }) => id,
      );

    expect(await ids("wiki-moderator")).toEqual([moderator.id]);
    expect(await ids("admin")).toEqual([moderator.id]);
    expect(await ids("global-chat-admin")).toEqual([]);

    // Removing every role returns the user to the default one.
    await admin((service) => service.setRoles(ACTOR, moderator.id, []));
    expect(await ids("admin")).toEqual([]);

    const { users } = await admin((service) =>
      service.listUsers({ search: plain.id }),
    );

    expect(users.map(({ id, roles }) => ({ id, roles }))).toEqual([
      { id: plain.id, roles: [] },
    ]);
  });

  it("lists a role's holders, admins among them, only to the internal service credential", async () => {
    const chatAdmin = await createUser("Chat admin", "global-chat-admin");
    const superAdmin = await createUser("Super admin", "wiki-moderator,admin");
    await createUser("Wiki only", "wiki-moderator");

    const holders = (authorization: string | undefined) =>
      admin((service) =>
        service.listRoleHolders(authorization, "global-chat-admin"),
      );

    const { userIds } = await holders(`Bearer ${IDP_SECRET}`);

    expect(userIds).toContain(chatAdmin.id);
    expect(userIds).toContain(superAdmin.id);
    expect(userIds).toHaveLength(2);

    // The panel's credential and a missing one open nothing here.
    await expect(holders(`Bearer ${SECRET}`)).rejects.toThrow();
    await expect(holders(undefined)).rejects.toThrow();
  });

  it("treats wildcard characters in a search as text", async () => {
    const literal = await createUser("100%_literal");
    await createUser("100 percent literal");

    const { users, total } = await admin((service) =>
      service.listUsers({ search: "0%_l" }),
    );

    expect(users.map(({ id }) => id)).toEqual([literal.id]);
    expect(total).toBe(1);
  });
});
