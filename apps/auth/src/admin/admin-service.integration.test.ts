import { testRpcUpstream } from "@lootlog/rpc/testing";
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
import { authApiKeys, type authUsers } from "#src/database/drizzle.schema";
import { runAuthMigrations } from "#src/database/migrations";
import { makeAuthPostgresLayer, PostgresPool } from "#src/database/postgres";
import { AdminService } from "./admin-service.js";

const ACTOR = "Operator (operator-1)";

const AUTH_SECRET = "integration-only-secret-01234567890123456789";

const adminAccountIds: string[] = [];

describe("AdminService against PostgreSQL and Better Auth", () => {
  let postgres: StartedPostgreSqlContainer;

  let runtime: ManagedRuntime.ManagedRuntime<
    AdminService | AuthDatabase | PostgresPool | PgClient.PgClient,
    unknown
  >;

  let auth: ReturnType<typeof createLootlogAuth>;

  let accountWritesFail = false;

  const admin = <A, E>(
    run: (service: typeof AdminService.Service) => Effect.Effect<A, E>,
  ) => runtime.runPromise(Effect.flatMap(AdminService, run));

  const createUser = async (name: string, role = "user") => {
    const { adapter } = await auth.$context;
    const now = new Date();

    return adapter.create<Omit<typeof authUsers.$inferSelect, "apiKeyLimit">>({
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
      webAppUrl: "https://web.example.test",
      trustedOrigins: ["https://example.test"],
      cookieDomain: ".example.test",
      cookiePrefix: "test",
      adminAccountIds,
      rpc: { port: 0, callerTokens: {}, api: testRpcUpstream },
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

        const provider = toAuthProvider(auth);

        return BetterAuthRuntime.of({
          ...provider,
          accounts: {
            ...provider.accounts,
            updateUser: (...input) =>
              accountWritesFail
                ? Promise.reject(new Error("Account store down"))
                : provider.accounts.updateUser(...input),
          },
        });
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

      return Redacted.make(`${provider.sessionCookieNames.token}=${cookie}`);
    };

    const authorize = (sessionCookie: Redacted.Redacted<string>) =>
      admin((service) => service.authorize(sessionCookie));

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

  it("keeps the entry of a ban that failed and says it did not complete", async () => {
    const user = await createUser("Unbanned");

    accountWritesFail = true;

    try {
      await expect(
        admin((service) =>
          service.ban(ACTOR, user.id, { reason: "Spam", expiresAt: null }),
        ),
      ).rejects.toThrow("Admin service unavailable");
    } finally {
      accountWritesFail = false;
    }

    const details = await admin((service) => service.getUser(user.id));

    expect(details.user.ban).toBeNull();
    expect(details.audit.map((entry) => entry.details)).toEqual([
      { reason: "Spam", expiresAt: null, completed: false },
    ]);
  });

  it("revokes one session of a user and leaves the others", async () => {
    const user = await createUser("Two devices");
    const other = await createUser("Bystander");
    const { internalAdapter } = await auth.$context;
    const kept = await internalAdapter.createSession(user.id);
    const revoked = await internalAdapter.createSession(user.id);

    await expect(
      admin((service) => service.revokeSession(ACTOR, other.id, revoked.id)),
    ).rejects.toThrow("Session not found");

    await admin((service) => service.revokeSession(ACTOR, user.id, revoked.id));

    expect(await internalAdapter.findSession(revoked.token)).toBeNull();
    expect(await internalAdapter.findSession(kept.token)).not.toBeNull();
  });

  it("revokes an API key only through its owner and records it", async () => {
    const owner = await createUser("Key owner");
    const other = await createUser("Bystander");
    const keyId = crypto.randomUUID();
    const now = new Date();

    await runtime.runPromise(
      Effect.flatMap(AuthDatabase, (database) =>
        database.insert(authApiKeys).values({
          id: keyId,
          name: "Integration",
          referenceId: owner.id,
          key: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );

    await expect(
      admin((service) => service.revokeApiKey(ACTOR, other.id, keyId)),
    ).rejects.toThrow("API key not found");

    expect(
      (await admin((service) => service.getUser(owner.id))).apiKeys,
    ).toHaveLength(1);

    await admin((service) => service.revokeApiKey(ACTOR, owner.id, keyId));

    const details = await admin((service) => service.getUser(owner.id));

    expect(details.apiKeys).toEqual([]);
    expect(details.audit).toMatchObject([
      { action: "api-key.revoke", details: { keyId, name: "Integration" } },
    ]);
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

    await admin((service) => service.setRoles(ACTOR, moderator.id, []));
    expect(await ids("admin")).toEqual([]);

    const { users } = await admin((service) =>
      service.listUsers({ search: plain.id }),
    );

    expect(users.map(({ id, roles }) => ({ id, roles }))).toEqual([
      { id: plain.id, roles: [] },
    ]);

    const listed = async (query: {
      userIds?: ReadonlyArray<string>;
      excludedUserIds?: ReadonlyArray<string>;
    }) =>
      (await admin((service) => service.listUsers(query))).users
        .map(({ id }) => id)
        .filter((id) => id === plain.id || id === moderator.id)
        .sort();

    expect(await listed({ userIds: [plain.id] })).toEqual([plain.id]);
    expect(await listed({ userIds: [] })).toEqual([]);
    expect(await listed({ excludedUserIds: [plain.id] })).toEqual([
      moderator.id,
    ]);
  });

  it("lists a role's holders, admins among them", async () => {
    const chatAdmin = await createUser("Chat admin", "global-chat-admin");
    const superAdmin = await createUser("Super admin", "wiki-moderator,admin");
    await createUser("Wiki only", "wiki-moderator");

    const { userIds } = await admin((service) =>
      service.listRoleHolders("global-chat-admin"),
    );

    expect(userIds).toContain(chatAdmin.id);
    expect(userIds).toContain(superAdmin.id);
    expect(userIds).toHaveLength(2);
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
