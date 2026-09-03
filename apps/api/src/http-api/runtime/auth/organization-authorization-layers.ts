import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Effect, Layer } from "effect";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import type { Permission as PermissionValue } from "@lootlog/schema/permissions";
import {
  ChatAccessDenied,
  ChatAuthorization,
  ChatNotFound,
} from "#src/http-api/handlers/chat/chat.handlers";
import {
  DocsAccessDenied,
  DocsAuthorization,
  DocsNotFound,
} from "#src/http-api/handlers/docs/docs.handlers";
import {
  EventsAccessDenied,
  EventsAuthorization,
  EventsNotFound,
} from "#src/http-api/handlers/events/events.handlers";
import {
  RecordsAccessDenied,
  RecordsAuthorization,
  RecordsNotFound,
} from "#src/http-api/handlers/records/records.operations";
import {
  LootlogConfigAccessDenied,
  LootlogConfigAuthorization,
} from "#src/http-api/handlers/lootlog-config/lootlog-config.handlers";
import {
  MapTemplatesAccessDenied,
  MapTemplatesAuthorization,
} from "#src/http-api/handlers/map-templates/map-templates.handlers";
import {
  NotificationsAccessDenied,
  NotificationsAuthorization,
  NotificationsNotFound,
} from "#src/http-api/handlers/notifications/notifications.handlers";
import {
  MembersAccessDenied,
  MembersAuthorization,
  MembersNotFound,
} from "#src/http-api/handlers/members/members.handlers";
import {
  OrganizationWorkspaceAccessDenied,
  OrganizationWorkspaceAuthorization,
  OrganizationWorkspaceNotFound,
} from "#src/http-api/handlers/organization-workspace/organization-workspace.operations";
import {
  PublicSystemAccessDenied,
  PublicSystemAuthorization,
} from "#src/http-api/handlers/public-system/public-system.operations";
import {
  TimersAccessDenied,
  TimersAuthorization,
} from "#src/http-api/handlers/timers/timers.handlers";
import { TimersNotFound } from "#src/http-api/handlers/timers/timer-errors";
import {
  AccountOrganizationAccessDenied,
  AccountOrganizationAuthorization,
  AccountOrganizationNotFound,
} from "#src/http-api/handlers/account-organization/account-organization.operations";
import { ForwardAuthIdentity } from "#src/http-api/runtime/auth/forward-auth-identity";
import {
  OrganizationContextLookup,
  OrganizationNotFound,
  type OrganizationContext,
} from "#src/http-api/runtime/auth/organization-context";

class OrganizationForbidden extends TaggedErrorClass<OrganizationForbidden>()(
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

    return { identity, context };
  });

type ResolvedAccess = {
  readonly identity: { readonly discordId: string; readonly userId: string };
  readonly context: OrganizationContext;
};

const toAuthorizedCaller = (access: ResolvedAccess) => ({
  ...access.identity,
  guild: access.context.guild,
  member: access.context.member,
  roles: access.context.roles,
  accessPolicy: createAccessPolicy({
    capabilities: access.context.permissions,
  }),
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
        Effect.map(({ identity, context }) => ({
          ...identity,
          guildId: context.guildId,
          permissions: context.permissions,
        })),
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
        Effect.map(({ identity, context }) => ({
          ...identity,
          guildId: context.guildId,
          permissions: context.permissions,
        })),
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

const organizationWorkspaceAuthorization = Effect.map(
  OrganizationContextLookup,
  (lookup) =>
    OrganizationWorkspaceAuthorization.of({
      identity: requestScopedIdentity,
      requireGuild: ({ guildId, allOf, anyOf }) =>
        resolveAccess(lookup, guildId, { allOf, anyOf }).pipe(
          Effect.map(({ identity, context }) => ({
            ...identity,
            guildId: context.guildId,
            ownerId: context.ownerId,
            permissions: context.permissions,
          })),
          Effect.mapError((error) =>
            mapAccessError(error, {
              notFound: () =>
                new OrganizationWorkspaceNotFound({
                  status: 404,
                  code: "GUILD_NOT_FOUND",
                }),
              forbidden: () =>
                new OrganizationWorkspaceAccessDenied({
                  status: 403,
                  code: "FORBIDDEN",
                }),
            }),
          ),
        ),
    }),
);

const accountOrganizationAuthorization = Effect.map(
  OrganizationContextLookup,
  (lookup) =>
    AccountOrganizationAuthorization.of({
      identity: requestScopedIdentity,
      requireGuild: ({ guildId, anyOf }) =>
        resolveAccess(lookup, guildId, { anyOf }).pipe(
          Effect.map(({ context }) => ({
            guildId: context.guildId,
            permissions: context.permissions,
          })),
          Effect.mapError((error) =>
            mapAccessError(error, {
              notFound: () =>
                new AccountOrganizationNotFound({
                  status: 404,
                  code: "GUILD_NOT_FOUND",
                }),
              forbidden: () =>
                new AccountOrganizationAccessDenied({
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
          Effect.map(({ context }) => ({
            guildId: context.guildId,
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

const docsAuthorization = Effect.map(OrganizationContextLookup, (lookup) =>
  DocsAuthorization.of({
    requireGuild: ({ guildId, capabilities, mode }) =>
      resolveAccess(
        lookup,
        guildId,
        mode === "all" ? { allOf: capabilities } : { anyOf: capabilities },
      ).pipe(
        Effect.map(toAuthorizedCaller),
        Effect.mapError((error) =>
          mapAccessError(error, {
            notFound: () =>
              new DocsNotFound({ status: 404, code: "GUILD_NOT_FOUND" }),
            forbidden: () =>
              new DocsAccessDenied({ status: 403, code: "FORBIDDEN" }),
          }),
        ),
      ),
  }),
);

const eventsAuthorization = Effect.map(OrganizationContextLookup, (lookup) =>
  EventsAuthorization.of({
    requireGuild: ({ guildId, capabilities, mode }) =>
      resolveAccess(
        lookup,
        guildId,
        mode === "all" ? { allOf: capabilities } : { anyOf: capabilities },
      ).pipe(
        Effect.map(toAuthorizedCaller),
        Effect.mapError((error) =>
          mapAccessError(error, {
            notFound: () =>
              new EventsNotFound({ status: 404, code: "GUILD_NOT_FOUND" }),
            forbidden: () =>
              new EventsAccessDenied({ status: 403, code: "FORBIDDEN" }),
          }),
        ),
      ),
  }),
);

const recordsAuthorization = Effect.map(OrganizationContextLookup, (lookup) =>
  RecordsAuthorization.of({
    requireCaller: requestScopedIdentity,
    requireGuild: ({ guildId, capability }) =>
      resolveAccess(lookup, guildId, { allOf: [capability] }).pipe(
        Effect.map(({ identity, context }) => ({
          ...identity,
          guild: context.guild,
          roles: context.roles,
          accessPolicy: createAccessPolicy({
            capabilities: context.permissions,
          }),
        })),
        Effect.mapError((error) =>
          mapAccessError(error, {
            notFound: () =>
              new RecordsNotFound({
                status: 404,
                code: "GUILD_NOT_FOUND",
              }),
            forbidden: () =>
              new RecordsAccessDenied({
                status: 403,
                code: "FORBIDDEN",
              }),
          }),
        ),
      ),
  }),
);

const notificationsAuthorization = Effect.map(
  OrganizationContextLookup,
  (lookup) =>
    NotificationsAuthorization.of({
      requireCaller: requestScopedIdentity,
      requireGuild: ({ guildId, capabilities }) =>
        resolveAccess(lookup, guildId, { anyOf: capabilities }).pipe(
          Effect.map(({ identity, context }) => ({
            ...identity,
            guild: context.guild,
            roles: context.roles,
            accessPolicy: createAccessPolicy({
              capabilities: context.permissions,
            }),
          })),
          Effect.mapError((error) =>
            mapAccessError(error, {
              notFound: () =>
                new NotificationsNotFound({
                  status: 404,
                  code: "GUILD_NOT_FOUND",
                }),
              forbidden: () =>
                new NotificationsAccessDenied({
                  status: 403,
                  code: "FORBIDDEN",
                }),
            }),
          ),
        ),
    }),
);

const mapTemplatesAuthorization = Effect.map(
  OrganizationContextLookup,
  (lookup) =>
    MapTemplatesAuthorization.of({
      requireCapability: ({ guildId, capability }) =>
        resolveAccess(lookup, guildId, { allOf: [capability] }).pipe(
          Effect.map(({ context }) => ({ guildId: context.guildId })),
          Effect.mapError((error) =>
            error instanceof OrganizationNotFound
              ? new MapTemplatesAccessDenied({
                  status: 404,
                  code: "GUILD_NOT_FOUND",
                })
              : new MapTemplatesAccessDenied({
                  status: 403,
                  code: "FORBIDDEN",
                }),
          ),
        ),
    }),
);

const publicSystemAuthorization = Effect.map(
  OrganizationContextLookup,
  (lookup) =>
    PublicSystemAuthorization.of({
      requireCapability: ({ guildId, anyOf }) =>
        resolveAccess(lookup, guildId, { anyOf }).pipe(
          Effect.map(({ context }) => ({ guildId: context.guildId })),
          Effect.mapError((error) =>
            error instanceof OrganizationNotFound
              ? new PublicSystemAccessDenied({
                  status: 404,
                  code: "GUILD_NOT_FOUND",
                })
              : new PublicSystemAccessDenied({
                  status: 403,
                  code: "FORBIDDEN",
                }),
          ),
        ),
    }),
);

const timersAuthorization = Effect.map(OrganizationContextLookup, (lookup) =>
  TimersAuthorization.of({
    identity: requestScopedIdentity,
    requireGuild: ({ guildId, capability }) =>
      resolveAccess(lookup, guildId, { allOf: [capability] }).pipe(
        Effect.map(({ identity, context }) => ({
          ...identity,
          guild: context.guild,
          roles: [...context.roles],
          accessPolicy: createAccessPolicy({
            capabilities: context.permissions,
          }),
        })),
        Effect.mapError((error) =>
          mapAccessError(error, {
            notFound: () =>
              new TimersNotFound({
                status: 404,
                code: "GUILD_NOT_FOUND",
              }),
            forbidden: () =>
              new TimersAccessDenied({ status: 403, code: "FORBIDDEN" }),
          }),
        ),
      ),
  }),
);

/** Organization-aware handler ports backed by the legacy context boundary. */
export const OrganizationAuthorizationLayers = Layer.mergeAll(
  Layer.effect(ChatAuthorization, chatAuthorization),
  Layer.effect(MembersAuthorization, membersAuthorization),
  Layer.effect(
    OrganizationWorkspaceAuthorization,
    organizationWorkspaceAuthorization,
  ),
  Layer.effect(
    AccountOrganizationAuthorization,
    accountOrganizationAuthorization,
  ),
  Layer.effect(LootlogConfigAuthorization, lootlogConfigAuthorization),
  Layer.effect(DocsAuthorization, docsAuthorization),
  Layer.effect(EventsAuthorization, eventsAuthorization),
  Layer.effect(RecordsAuthorization, recordsAuthorization),
  Layer.effect(NotificationsAuthorization, notificationsAuthorization),
  Layer.effect(MapTemplatesAuthorization, mapTemplatesAuthorization),
  Layer.effect(PublicSystemAuthorization, publicSystemAuthorization),
  Layer.effect(TimersAuthorization, timersAuthorization),
);
