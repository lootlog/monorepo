import {
  type ApplicationError,
  AuthenticationRequiredError,
  PermissionDeniedError,
} from "@lootlog/protocol/http/errors";
import { hasServiceAuthorization } from "@lootlog/protocol/http/service-auth";
import {
  parsePlatformRoles,
  type PlatformRole,
} from "@lootlog/schema/platform-roles";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { Effect, type Redacted } from "effect";
import { authUsers } from "#src/database/drizzle.schema";
import type { AdminUser } from "#src/http-api/contracts/admin/schemas";

type UserRow = typeof authUsers.$inferSelect;

export type AdminOperator = {
  readonly userId: string;
  readonly name: string;
};

export const escapeLike = (text: string) => text.replace(/[\\%_]/gu, "\\$&");

export const inForce = (now: Date) =>
  and(
    eq(authUsers.banned, true),
    or(isNull(authUsers.banExpires), gt(authUsers.banExpires, now)),
  );

export const holdsRole = (role: PlatformRole) =>
  sql<boolean>`${role} = any(string_to_array(${authUsers.role}, ','))`;

export const toUser = (
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

export const auditActor = (operator: AdminOperator) =>
  `${operator.name} (${operator.userId})`;
