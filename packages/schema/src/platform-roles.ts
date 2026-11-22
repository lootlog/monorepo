import { Schema } from "effect";

export const PLATFORM_ROLES = [
  "admin",
  "wiki-moderator",
  "global-chat-admin",
] as const;

export const PlatformRole = Schema.Literals(PLATFORM_ROLES);

export type PlatformRole = typeof PlatformRole.Type;

export const AUTH_ROLES_HEADER = "x-auth-roles";

export const PLATFORM_ROLE_HOLDERS_PATH =
  "/auth/internal/platform-role-holders";

export const PlatformRoleHolders = Schema.Struct({
  userIds: Schema.Array(Schema.String),
});

const DEFAULT_STORED_ROLE = "user";

const isPlatformRole = Schema.is(PlatformRole);

export const parsePlatformRoles = (
  value: string | null | undefined,
): ReadonlyArray<PlatformRole> => {
  const named = new Set(
    (value ?? "")
      .split(",")
      .map((role) => role.trim())
      .filter(isPlatformRole),
  );

  return PLATFORM_ROLES.filter((role) => named.has(role));
};

export const readForwardedPlatformRoles = (
  headers: Readonly<Record<string, string | undefined>>,
): ReadonlyArray<PlatformRole> =>
  parsePlatformRoles(headers[AUTH_ROLES_HEADER]);

export const formatPlatformRoles = (
  roles: ReadonlyArray<PlatformRole>,
): string => PLATFORM_ROLES.filter((role) => roles.includes(role)).join(",");

export const storePlatformRoles = (
  roles: ReadonlyArray<PlatformRole>,
): string => formatPlatformRoles(roles) || DEFAULT_STORED_ROLE;

export const hasPlatformRole = (
  roles: ReadonlyArray<PlatformRole>,
  role: PlatformRole,
): boolean => roles.includes("admin") || roles.includes(role);
