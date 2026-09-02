import { Effect, Layer, Schema } from "effect";
import type { Permission as PermissionValue } from "@lootlog/schema/permissions";
import {
  ChatAccessDenied,
  ChatAuthorization,
  ChatNotFound,
} from "../handlers/chat/chat.handlers.js";
import {
  LootlogConfigAccessDenied,
  LootlogConfigAuthorization,
} from "../handlers/lootlog-config/lootlog-config.handlers.js";
import {
  MembersAccessDenied,
  MembersAuthorization,
  MembersNotFound,
} from "../handlers/members/members.handlers.js";
import {
  ReservationsRolesAccessDenied,
  ReservationsRolesAuthorization,
  ReservationsRolesNotFound,
} from "../handlers/reservations-roles/reservations-roles.handlers.js";
import {
  UsersGuildsAccessDenied,
  UsersGuildsAuthorization,
  UsersGuildsNotFound,
} from "../handlers/users-guilds/users-guilds.handlers.js";
import { ForwardAuthIdentity } from "./forward-auth-identity.js";
import {
  OrganizationContextLookup,
  OrganizationNotFound,
} from "./organization-context.js";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
class OrganizationForbidden extends Schema.TaggedError<OrganizationForbidden>()(
  "OrganizationForbidden",
  {},
) {}

type PermissionRequirements = {
  readonly allOf?: ReadonlyArray<PermissionValue>;
  readonly anyOf?: ReadonlyArray<PermissionValue>;
};

const requestScopedIdentity = Effect.map(
  ForwardAuthIdentity,
  ({ discordId, userId }) => ({ discordId, userId }),
) as Effect.Effect<{ readonly discordId: string; readonly userId: string }>;

const hasPermissions = (
  permissions: ReadonlyArray<PermissionValue>,
  requirements: PermissionRequirements,
): boolean => {
  const available = new Set(permissions);
  const hasAll =
    requirements.allOf === undefined ||
    requirements.allOf.every((permission) => available.has(permission));
  const hasAny =
    requirements.anyOf === undefined ||
    requirements.anyOf.length === 0 ||
    requirements.anyOf.some((permission) => available.has(permission));
  return hasAll && hasAny;
};

const resolveAccess = (
  lookup: OrganizationContextLookup["Service"],
  guildId: string,
  requirements: PermissionRequirements,
) =>
  Effect.gen(function* () {
    const identity = yield* requestScopedIdentity;
    const context = yield* lookup.lookup({ ...identity, guildId });

    if (
      context === null ||
      !hasPermissions(context.permissions, requirements)
    ) {
      return yield* new OrganizationForbidden();
    }

    return { ...identity, ...context };
  });

const mapAccessError = <NotFound, Forbidden>(
  error: OrganizationNotFound | OrganizationForbidden,
  errors: {
    readonly notFound: () => NotFound;
    readonly forbidden: () => Forbidden;
  },
): NotFound | Forbidden =>
  error instanceof OrganizationNotFound
    ? errors.notFound()
    : errors.forbidden();

const chatAuthorization = Effect.map(OrganizationContextLookup, (lookup) =>
  ChatAuthorization.of({
    requireGuild: ({ guildId, allOf }) =>
      resolveAccess(lookup, guildId, { allOf }).pipe(
        Effect.mapError((error) =>
          mapAccessError(error, {
            notFound: () =>
              new ChatNotFound({ status: 404, code: "GUILD_NOT_FOUND" }),
            forbidden: () =>
              new ChatAccessDenied({ status: 403, code: "FORBIDDEN" }),
          }),
        ),
      ),
  }),
);

const membersAuthorization = Effect.map(OrganizationContextLookup, (lookup) =>
  MembersAuthorization.of({
    identity: requestScopedIdentity,
    requireGuild: ({ guildId, anyOf }) =>
      resolveAccess(lookup, guildId, { anyOf }).pipe(
        Effect.mapError((error) =>
          mapAccessError(error, {
            notFound: () =>
              new MembersNotFound({ status: 404, code: "GUILD_NOT_FOUND" }),
            forbidden: () =>
              new MembersAccessDenied({ status: 403, code: "FORBIDDEN" }),
          }),
        ),
      ),
  }),
);

const reservationsRolesAuthorization = Effect.map(
  OrganizationContextLookup,
  (lookup) =>
    ReservationsRolesAuthorization.of({
      identity: requestScopedIdentity,
      requireGuild: ({ guildId, allOf, anyOf }) =>
        resolveAccess(lookup, guildId, { allOf, anyOf }).pipe(
          Effect.mapError((error) =>
            mapAccessError(error, {
              notFound: () =>
                new ReservationsRolesNotFound({
                  status: 404,
                  code: "GUILD_NOT_FOUND",
                }),
              forbidden: () =>
                new ReservationsRolesAccessDenied({
                  status: 403,
                  code: "FORBIDDEN",
                }),
            }),
          ),
        ),
    }),
);

const usersGuildsAuthorization = Effect.map(
  OrganizationContextLookup,
  (lookup) =>
    UsersGuildsAuthorization.of({
      identity: requestScopedIdentity,
      requireGuild: ({ guildId, anyOf }) =>
        resolveAccess(lookup, guildId, { anyOf }).pipe(
          Effect.map(({ guildId: canonicalGuildId, permissions }) => ({
            guildId: canonicalGuildId,
            permissions,
          })),
          Effect.mapError((error) =>
            mapAccessError(error, {
              notFound: () =>
                new UsersGuildsNotFound({
                  status: 404,
                  code: "GUILD_NOT_FOUND",
                }),
              forbidden: () =>
                new UsersGuildsAccessDenied({
                  status: 403,
                  code: "FORBIDDEN",
                }),
            }),
          ),
        ),
    }),
);

const lootlogConfigAuthorization = Effect.map(
  OrganizationContextLookup,
  (lookup) =>
    LootlogConfigAuthorization.of({
      requireCapability: ({ guildId, capability }) =>
        resolveAccess(lookup, guildId, { allOf: [capability] }).pipe(
          Effect.map(({ guildId: canonicalGuildId }) => ({
            guildId: canonicalGuildId,
          })),
          Effect.mapError((error) =>
            error instanceof OrganizationNotFound
              ? new LootlogConfigAccessDenied({
                  status: 404,
                  code: "GUILD_NOT_FOUND",
                })
              : new LootlogConfigAccessDenied({
                  status: 403,
                  code: "FORBIDDEN",
                }),
          ),
        ),
    }),
);

/** Organization-aware handler ports backed by the legacy context boundary. */
export const OrganizationAuthorizationLayers = Layer.mergeAll(
  Layer.effect(ChatAuthorization, chatAuthorization),
  Layer.effect(MembersAuthorization, membersAuthorization),
  Layer.effect(ReservationsRolesAuthorization, reservationsRolesAuthorization),
  Layer.effect(UsersGuildsAuthorization, usersGuildsAuthorization),
  Layer.effect(LootlogConfigAuthorization, lootlogConfigAuthorization),
);
