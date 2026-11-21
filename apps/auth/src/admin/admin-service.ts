import {
  type ApplicationError,
  AuthenticationRequiredError,
  DependencyUnavailableError,
  InvalidRequestError,
  PermissionDeniedError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import { hasServiceAuthorization } from "@lootlog/protocol/http/service-auth";
import {
  PLATFORM_ROLES,
  parsePlatformRoles,
  type PlatformRole,
  storePlatformRoles,
} from "@lootlog/schema/platform-roles";
import {
  and,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { Context, Effect, Layer, type Redacted } from "effect";
import { BetterAuthRuntime } from "#src/auth/provider/better-auth";
import { AppConfig } from "#src/config/env";
import { AuthDatabase } from "#src/database/drizzle";
import type { AdminAuditAction, AdminAuditDetails } from "./audit.js";
import {
  adminAuditLog,
  authApiKeys,
  authSessions,
  authUsers,
} from "#src/database/drizzle.schema";
import type {
  AdminAuditEntry,
  AdminUser,
  AdminUsersQuery,
  BanAdminUser,
} from "#src/http-api/contracts/admin/schemas";

type UserRow = typeof authUsers.$inferSelect;

/** Audit entries shown beside one User. */
const USER_AUDIT_LIMIT = 25;

const unavailable = () =>
  new DependencyUnavailableError("Admin service unavailable");

const userNotFound = () => new ResourceNotFoundError("User not found");

/** `%`, `_` and `\` match themselves in the search text. */
const escapeLike = (text: string) => text.replace(/[\\%_]/gu, "\\$&");

const inForce = (now: Date) =>
  and(
    eq(authUsers.banned, true),
    or(isNull(authUsers.banExpires), gt(authUsers.banExpires, now)),
  );

/** Matches a role inside the comma-separated list Better Auth stores. */
const holdsRole = (role: PlatformRole) =>
  sql<boolean>`${role} = any(string_to_array(${authUsers.role}, ','))`;

const toUser = (
  row: UserRow,
  activeSessions: number,
  now: Date,
): AdminUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  image: row.image,
  discordId: row.discordId,
  createdAt: row.createdAt.toISOString(),
  roles: parsePlatformRoles(row.role),
  ban:
    row.banned === true &&
    (row.banExpires === null || row.banExpires.getTime() > now.getTime())
      ? {
          reason: row.banReason,
          expiresAt: row.banExpires?.toISOString() ?? null,
        }
      : null,
  activeSessions,
});

/** The signed-in admin an admin API request acts for. */
export type AdminOperator = {
  readonly userId: string;
  readonly name: string;
};

/**
 * The operator of an admin API request. Two things must hold together: the
 * request comes from the admin panel, which alone knows the service secret,
 * and it carries the live session of a User listed as an admin account.
 * Neither a secret without such a session nor an admin's session presented
 * anywhere else opens the admin API, and nobody enters while the secret or
 * the admin list is not configured.
 */
export const authorizeAdminRequest = Effect.fn("authorizeAdminRequest")(
  function* (
    headers: Headers,
    access: {
      readonly secret: Redacted.Redacted<string> | undefined;
      readonly adminUserIds: ReadonlyArray<string>;
      readonly getFreshSession: (
        headers: Headers,
      ) => Effect.Effect<AdminOperator | null, ApplicationError>;
    },
  ) {
    if (
      !hasServiceAuthorization(
        headers.get("authorization") ?? undefined,
        access.secret,
      )
    )
      return yield* new AuthenticationRequiredError();

    const operator = yield* access.getFreshSession(headers);

    if (!operator)
      return yield* new AuthenticationRequiredError({
        code: "ADMIN_SESSION_REQUIRED",
        message: "Sign in to Lootlog first",
      });

    if (!access.adminUserIds.includes(operator.userId))
      return yield* new PermissionDeniedError({
        code: "ADMIN_ACCESS_REQUIRED",
        message: "Not an admin account",
      });

    return operator;
  },
);

/** How the audit log names an operator: readable, and exact by id. */
export const auditActor = (operator: AdminOperator) =>
  `${operator.name} (${operator.userId})`;

export class AdminService extends Context.Service<
  AdminService,
  {
    /** The signed-in admin a request from the admin panel acts for. */
    readonly authorize: (
      headers: Headers,
    ) => Effect.Effect<AdminOperator, ApplicationError>;
    readonly overview: () => Effect.Effect<
      {
        users: number;
        banned: number;
        activeSessions: number;
        roles: ReadonlyArray<{ role: PlatformRole; users: number }>;
      },
      ApplicationError
    >;
    readonly listUsers: (
      query: AdminUsersQuery,
    ) => Effect.Effect<
      { users: ReadonlyArray<AdminUser>; total: number },
      ApplicationError
    >;
    readonly getUser: (userId: string) => Effect.Effect<
      {
        user: AdminUser;
        sessions: ReadonlyArray<{
          id: string;
          createdAt: string;
          updatedAt: string;
          expiresAt: string;
          ipAddress: string | null;
          userAgent: string | null;
        }>;
        apiKeys: ReadonlyArray<{
          id: string;
          name: string;
          start: string | null;
          enabled: boolean;
          createdAt: string;
          expiresAt: string | null;
        }>;
        audit: ReadonlyArray<AdminAuditEntry>;
      },
      ApplicationError
    >;
    readonly setRoles: (
      actor: string,
      userId: string,
      roles: ReadonlyArray<PlatformRole>,
    ) => Effect.Effect<{ user: AdminUser }, ApplicationError>;
    /** Bans the User and ends every session they hold. */
    readonly ban: (
      actor: string,
      userId: string,
      ban: BanAdminUser,
    ) => Effect.Effect<{ user: AdminUser }, ApplicationError>;
    readonly unban: (
      actor: string,
      userId: string,
    ) => Effect.Effect<{ user: AdminUser }, ApplicationError>;
    readonly revokeSessions: (
      actor: string,
      userId: string,
    ) => Effect.Effect<void, ApplicationError>;
    readonly revokeSession: (
      actor: string,
      userId: string,
      sessionId: string,
    ) => Effect.Effect<void, ApplicationError>;
    readonly revokeApiKey: (
      actor: string,
      userId: string,
      keyId: string,
    ) => Effect.Effect<void, ApplicationError>;
    /**
     * The Users whose roles grant `role`, for a service that presents the
     * internal service credential. An admin holds every role.
     */
    readonly listRoleHolders: (
      authorization: string | undefined,
      role: PlatformRole,
    ) => Effect.Effect<{ userIds: ReadonlyArray<string> }, ApplicationError>;
    readonly listAudit: (page: {
      readonly limit?: number;
      readonly offset?: number;
    }) => Effect.Effect<
      { entries: ReadonlyArray<AdminAuditEntry>; total: number },
      ApplicationError
    >;
  }
>()("@lootlog/auth/AdminService") {
  static readonly layer = Layer.effect(
    AdminService,
    Effect.gen(function* () {
      const database = yield* AuthDatabase;
      const auth = yield* BetterAuthRuntime;
      const config = yield* AppConfig;

      const query = <A, E>(effect: Effect.Effect<A, E>) =>
        Effect.mapError(effect, unavailable);

      /** A write that goes through Better Auth, so its session store follows. */
      const account = <A>(
        run: (accounts: NonNullable<typeof auth.accounts>) => Promise<A>,
      ) =>
        Effect.gen(function* () {
          const { accounts } = auth;

          if (!accounts) return yield* unavailable();

          return yield* Effect.tryPromise({
            try: () => run(accounts),
            catch: unavailable,
          });
        });

      const countActiveSessions = (
        userIds: ReadonlyArray<string>,
        now: Date,
      ) =>
        userIds.length === 0
          ? Effect.succeed(new Map<string, number>())
          : query(
              database
                .select({ userId: authSessions.userId, sessions: count() })
                .from(authSessions)
                .where(
                  and(
                    inArray(authSessions.userId, [...userIds]),
                    gt(authSessions.expiresAt, now),
                  ),
                )
                .groupBy(authSessions.userId),
            ).pipe(
              Effect.map(
                (rows) =>
                  new Map(rows.map((row) => [row.userId, row.sessions])),
              ),
            );

      const findUser = Effect.fn("AdminService.findUser")(function* (
        userId: string,
      ) {
        const rows = yield* query(
          database
            .select()
            .from(authUsers)
            .where(eq(authUsers.id, userId))
            .limit(1),
        );

        const row = rows[0];

        if (!row) return yield* userNotFound();

        return row;
      });

      const readUser = Effect.fn("AdminService.readUser")(function* (
        userId: string,
      ) {
        const row = yield* findUser(userId);
        const now = new Date();
        const sessions = yield* countActiveSessions([userId], now);

        return toUser(row, sessions.get(userId) ?? 0, now);
      });

      const record = (
        actor: string,
        action: AdminAuditAction,
        targetUserId: string,
        details?: AdminAuditDetails,
        executor: Pick<typeof database, "insert"> = database,
      ) => {
        const id = crypto.randomUUID();

        return query(
          executor.insert(adminAuditLog).values({
            id,
            actor,
            action,
            targetUserId,
            details: details ?? null,
          }),
        ).pipe(
          Effect.tap(() =>
            Effect.logInfo("Admin action").pipe(
              Effect.annotateLogs({ context: "Admin", action, targetUserId }),
            ),
          ),
          Effect.as(id),
        );
      };

      /**
       * Runs an action that Better Auth carries out, which cannot share a
       * transaction with the audit log. The entry is written first, so nothing
       * changes without one. An action that then fails or is cut short may
       * have landed in part, so its entry stays and says it did not complete.
       */
      const audited = <A>(
        actor: string,
        action: AdminAuditAction,
        targetUserId: string,
        details: AdminAuditDetails | undefined,
        run: Effect.Effect<A, ApplicationError>,
      ) =>
        Effect.gen(function* () {
          const id = yield* record(actor, action, targetUserId, details);

          return yield* Effect.onError(run, () =>
            database
              .update(adminAuditLog)
              .set({ details: { ...details, completed: false } })
              .where(eq(adminAuditLog.id, id))
              .pipe(
                Effect.catchCause(() =>
                  Effect.logError("Admin action left unmarked").pipe(
                    Effect.annotateLogs({
                      context: "Admin",
                      action,
                      targetUserId,
                    }),
                  ),
                ),
              ),
          );
        });

      const readAudit = Effect.fn("AdminService.readAudit")(function* (
        page: { readonly limit: number; readonly offset: number },
        targetUserId?: string,
      ) {
        const rows = yield* query(
          database
            .select({ entry: adminAuditLog, targetName: authUsers.name })
            .from(adminAuditLog)
            .leftJoin(authUsers, eq(authUsers.id, adminAuditLog.targetUserId))
            .where(
              targetUserId === undefined
                ? undefined
                : eq(adminAuditLog.targetUserId, targetUserId),
            )
            .orderBy(desc(adminAuditLog.createdAt), desc(adminAuditLog.id))
            .limit(page.limit)
            .offset(page.offset),
        );

        return rows.map(({ entry, targetName }) => ({
          id: entry.id,
          actor: entry.actor,
          action: entry.action,
          targetUserId: entry.targetUserId,
          targetName,
          details: entry.details,
          createdAt: entry.createdAt.toISOString(),
        }));
      });

      return AdminService.of({
        authorize: (headers) =>
          authorizeAdminRequest(headers, {
            secret: config.adminApiSecret,
            adminUserIds: config.adminAccountIds,
            getFreshSession: (sessionHeaders) =>
              account((accounts) => accounts.getFreshSession(sessionHeaders)),
          }),

        overview: Effect.fn("AdminService.overview")(function* () {
          const now = new Date();

          const [users, banned, activeSessions, roleRows] = yield* query(
            Effect.all(
              [
                database.select({ value: count() }).from(authUsers),
                database
                  .select({ value: count() })
                  .from(authUsers)
                  .where(inForce(now)),
                database
                  .select({ value: count() })
                  .from(authSessions)
                  .where(gt(authSessions.expiresAt, now)),
                database
                  .select({ role: authUsers.role, users: count() })
                  .from(authUsers)
                  .where(or(...PLATFORM_ROLES.map((role) => holdsRole(role))))
                  .groupBy(authUsers.role),
              ],
              { concurrency: "unbounded" },
            ),
          );

          return {
            users: users[0]?.value ?? 0,
            banned: banned[0]?.value ?? 0,
            activeSessions: activeSessions[0]?.value ?? 0,
            roles: PLATFORM_ROLES.map((role) => ({
              role,
              users: roleRows
                .filter((row) => parsePlatformRoles(row.role).includes(role))
                .reduce((sum, row) => sum + row.users, 0),
            })),
          };
        }),

        listUsers: Effect.fn("AdminService.listUsers")(function* (input) {
          const now = new Date();
          const search = input.search?.trim();
          const pattern = search ? `%${escapeLike(search)}%` : undefined;

          const where = and(
            pattern === undefined || search === undefined
              ? undefined
              : or(
                  ilike(authUsers.name, pattern),
                  ilike(authUsers.email, pattern),
                  eq(authUsers.id, search),
                  eq(authUsers.discordId, search),
                ),
            input.role === undefined ? undefined : holdsRole(input.role),
            input.banned === undefined
              ? undefined
              : input.banned
                ? inForce(now)
                : sql`${inForce(now)} is not true`,
          );

          const [rows, totals] = yield* query(
            Effect.all(
              [
                database
                  .select()
                  .from(authUsers)
                  .where(where)
                  .orderBy(desc(authUsers.createdAt), desc(authUsers.id))
                  .limit(input.limit ?? 25)
                  .offset(input.offset ?? 0),
                database
                  .select({ value: count() })
                  .from(authUsers)
                  .where(where),
              ],
              { concurrency: "unbounded" },
            ),
          );

          const sessions = yield* countActiveSessions(
            rows.map((row) => row.id),
            now,
          );

          return {
            users: rows.map((row) =>
              toUser(row, sessions.get(row.id) ?? 0, now),
            ),
            total: totals[0]?.value ?? 0,
          };
        }),

        getUser: Effect.fn("AdminService.getUser")(function* (userId) {
          const row = yield* findUser(userId);
          const now = new Date();

          const [sessions, apiKeys, audit] = yield* Effect.all(
            [
              query(
                database
                  .select()
                  .from(authSessions)
                  .where(
                    and(
                      eq(authSessions.userId, userId),
                      gt(authSessions.expiresAt, now),
                    ),
                  )
                  .orderBy(desc(authSessions.updatedAt)),
              ),
              query(
                database
                  .select()
                  .from(authApiKeys)
                  .where(eq(authApiKeys.referenceId, userId))
                  .orderBy(desc(authApiKeys.createdAt)),
              ),
              readAudit({ limit: USER_AUDIT_LIMIT, offset: 0 }, userId),
            ],
            { concurrency: "unbounded" },
          );

          return {
            user: toUser(row, sessions.length, now),
            // The token is the credential itself and never leaves the service.
            sessions: sessions.map((session) => ({
              id: session.id,
              createdAt: session.createdAt.toISOString(),
              updatedAt: session.updatedAt.toISOString(),
              expiresAt: session.expiresAt.toISOString(),
              ipAddress: session.ipAddress,
              userAgent: session.userAgent,
            })),
            apiKeys: apiKeys.map((key) => ({
              id: key.id,
              name: key.name ?? "",
              start: key.start,
              enabled: key.enabled === true,
              createdAt: key.createdAt.toISOString(),
              expiresAt: key.expiresAt?.toISOString() ?? null,
            })),
            audit,
          };
        }),

        setRoles: Effect.fn("AdminService.setRoles")(
          function* (actor, userId, roles) {
            const row = yield* findUser(userId);
            const previous = parsePlatformRoles(row.role);
            const role = storePlatformRoles(roles);
            const next = parsePlatformRoles(role);

            yield* audited(
              actor,
              "roles.set",
              userId,
              { previous, next },
              account((accounts) => accounts.updateUser(userId, { role })),
            );

            return { user: yield* readUser(userId) };
          },
        ),

        ban: Effect.fn("AdminService.ban")(function* (actor, userId, ban) {
          yield* findUser(userId);

          const expiresAt =
            ban.expiresAt === null ? null : new Date(ban.expiresAt);

          if (expiresAt !== null && expiresAt.getTime() <= Date.now())
            return yield* new InvalidRequestError({
              code: "BAN_EXPIRY_IN_PAST",
              message: "The ban must end in the future",
            });

          // The ban lands first: a session revoked before it could be replaced
          // by a new sign-in.
          yield* audited(
            actor,
            "ban.set",
            userId,
            { reason: ban.reason, expiresAt: ban.expiresAt },
            account(async (accounts) => {
              await accounts.updateUser(userId, {
                banned: true,
                banReason: ban.reason,
                banExpires: expiresAt,
              });

              await accounts.revokeSessions(userId);
            }),
          );

          return { user: yield* readUser(userId) };
        }),

        unban: Effect.fn("AdminService.unban")(function* (actor, userId) {
          yield* findUser(userId);

          yield* audited(
            actor,
            "ban.lift",
            userId,
            undefined,
            account((accounts) =>
              accounts.updateUser(userId, {
                banned: false,
                banReason: null,
                banExpires: null,
              }),
            ),
          );

          return { user: yield* readUser(userId) };
        }),

        revokeSessions: Effect.fn("AdminService.revokeSessions")(
          function* (actor, userId) {
            yield* findUser(userId);
            yield* audited(
              actor,
              "sessions.revoke",
              userId,
              undefined,
              account((accounts) => accounts.revokeSessions(userId)),
            );
          },
        ),

        revokeSession: Effect.fn("AdminService.revokeSession")(
          function* (actor, userId, sessionId) {
            const rows = yield* query(
              database
                .select({ token: authSessions.token })
                .from(authSessions)
                .where(
                  and(
                    eq(authSessions.id, sessionId),
                    eq(authSessions.userId, userId),
                  ),
                )
                .limit(1),
            );

            const session = rows[0];

            if (!session)
              return yield* new ResourceNotFoundError("Session not found");

            yield* audited(
              actor,
              "session.revoke",
              userId,
              { sessionId },
              account((accounts) => accounts.revokeSession(session.token)),
            );
          },
        ),

        revokeApiKey: Effect.fn("AdminService.revokeApiKey")(
          function* (actor, userId, keyId) {
            // One transaction: a key must not vanish without its audit entry.
            const key = yield* query(
              database.transaction((transaction) =>
                Effect.gen(function* () {
                  const removed = yield* transaction
                    .delete(authApiKeys)
                    .where(
                      and(
                        eq(authApiKeys.id, keyId),
                        eq(authApiKeys.referenceId, userId),
                      ),
                    )
                    .returning({ name: authApiKeys.name });

                  const removedKey = removed[0];

                  if (removedKey)
                    yield* record(
                      actor,
                      "api-key.revoke",
                      userId,
                      { keyId, name: removedKey.name },
                      transaction,
                    );

                  return removedKey;
                }),
              ),
            );

            if (!key)
              return yield* new ResourceNotFoundError("API key not found");
          },
        ),

        listRoleHolders: Effect.fn("AdminService.listRoleHolders")(
          function* (authorization, role) {
            if (!hasServiceAuthorization(authorization, config.idpTokenSecret))
              return yield* new AuthenticationRequiredError();

            const rows = yield* query(
              database
                .select({ id: authUsers.id })
                .from(authUsers)
                .where(or(holdsRole(role), holdsRole("admin")))
                .orderBy(authUsers.id),
            );

            return { userIds: rows.map((row) => row.id) };
          },
        ),

        listAudit: Effect.fn("AdminService.listAudit")(function* (page) {
          const [entries, totals] = yield* Effect.all(
            [
              readAudit({
                limit: page.limit ?? 50,
                offset: page.offset ?? 0,
              }),
              query(database.select({ value: count() }).from(adminAuditLog)),
            ],
            { concurrency: "unbounded" },
          );

          return { entries, total: totals[0]?.value ?? 0 };
        }),
      });
    }),
  );
}
