import { Schema } from "effect";

/**
 * Roles a User holds across Lootlog, beside whatever an Organization grants
 * its Members. The auth service is their only writer; the admin panel is the
 * only surface that changes them.
 *
 * - `admin` holds every other role.
 * - `wiki-moderator` reviews the reports readers send about catalog pages.
 * - `global-chat-admin` moderates the global chat and grants character auras.
 */
export const PLATFORM_ROLES = [
  "admin",
  "wiki-moderator",
  "global-chat-admin",
] as const;

export const PlatformRole = Schema.Literals(PLATFORM_ROLES);

export type PlatformRole = typeof PlatformRole.Type;

/**
 * Forward-auth header naming the caller's platform roles, comma separated and
 * empty for a caller without any. The edge strips any copy a client sent, like
 * the identity headers beside it.
 */
export const AUTH_ROLES_HEADER = "x-auth-roles";

/** The role a User without platform roles is stored with. */
const DEFAULT_STORED_ROLE = "user";

const isPlatformRole = Schema.is(PlatformRole);

/**
 * The platform roles in a stored or forwarded role list. Unknown names are
 * dropped, so a role removed from the catalog stops granting anything.
 */
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

/**
 * The platform roles the edge asserted for the caller. The auth service sends
 * none for an API key, so a key never acts with its owner's roles.
 */
export const readForwardedPlatformRoles = (
  headers: Readonly<Record<string, string | undefined>>,
): ReadonlyArray<PlatformRole> =>
  parsePlatformRoles(headers[AUTH_ROLES_HEADER]);

/** The header value for a set of roles: catalog order, comma separated. */
export const formatPlatformRoles = (
  roles: ReadonlyArray<PlatformRole>,
): string => PLATFORM_ROLES.filter((role) => roles.includes(role)).join(",");

/** The stored role list; a User without platform roles keeps the default. */
export const storePlatformRoles = (
  roles: ReadonlyArray<PlatformRole>,
): string => formatPlatformRoles(roles) || DEFAULT_STORED_ROLE;

/** Whether the roles grant `role`; an admin holds every role. */
export const hasPlatformRole = (
  roles: ReadonlyArray<PlatformRole>,
  role: PlatformRole,
): boolean => roles.includes("admin") || roles.includes(role);
