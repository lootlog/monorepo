import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Effect, Layer } from "effect";
import { apiKeyAllowsOrganization } from "@lootlog/schema/api-key-policy";
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
import { requestScopedIdentity } from "#src/runtime/auth/forward-auth-identity";
import {
  OrganizationContextLookup,
  OrganizationNotFound,
  type OrganizationContext,
} from "#src/runtime/auth/organization-context";

class OrganizationForbidden extends TaggedErrorClass<OrganizationForbidden>()(
  "OrganizationForbidden",
  {},
) {}

type PermissionRequirements = {
  readonly allOf?: ReadonlyArray<PermissionValue>;
  readonly anyOf?: ReadonlyArray<PermissionValue>;
};

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
      !apiKeyAllowsOrganization(identity.apiKey, context.guildId) ||
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

type GuildNotFoundError<E> = new (props: {
  readonly status: 404;
  readonly code: "GUILD_NOT_FOUND";
}) => E;

type GuildForbiddenError<E> = new (props: {
  readonly status: 403;
  readonly code: "FORBIDDEN";
}) => E;

/**
 * Every handler port resolves organization access the same way: look the
 * caller up, project the resolved access into the shape that port declares,
 * and translate the two access failures into that port's own tagged errors.
 * The tagged errors stay distinct per port because `Effect.catchTags` and the
 * HTTP status mapping dispatch on them; a port that reports both failures with
 * one class simply passes that class twice.
 */
const guildAccess =
  <A, NotFound, Forbidden>(
    project: (access: ResolvedAccess) => A,
    NotFoundError: GuildNotFoundError<NotFound>,
    ForbiddenError: GuildForbiddenError<Forbidden>,
  ) =>
  (
    lookup: OrganizationContextLookup["Service"],
    guildId: string,
    requirements: PermissionRequirements,
  ) =>
    resolveAccess(lookup, guildId, requirements).pipe(
      Effect.map(project),
      Effect.mapError((error) =>
        mapAccessError(error, {
          notFound: () =>
            new NotFoundError({ status: 404, code: "GUILD_NOT_FOUND" }),
          forbidden: () =>
            new ForbiddenError({ status: 403, code: "FORBIDDEN" }),
        }),
      ),
    );

const toGuildScope = (access: ResolvedAccess) => ({
  guildId: access.context.guildId,
});

const toGuildPermissionScope = (access: ResolvedAccess) => ({
  guildId: access.context.guildId,
  permissions: access.context.permissions,
});

const toGuildScopedCaller = (access: ResolvedAccess) => ({
  ...access.identity,
  ...toGuildPermissionScope(access),
});

const toRoleScopedCaller = (access: ResolvedAccess) => ({
  ...access.identity,
  guild: access.context.guild,
  roles: access.context.roles,
  accessPolicy: createAccessPolicy({
    capabilities: access.context.permissions,
  }),
});

/** `mode` selects between "every capability" and "any capability". */
const capabilityRequirements = (
  capabilities: ReadonlyArray<PermissionValue>,
  mode: "all" | "any",
): PermissionRequirements =>
  mode === "all" ? { allOf: capabilities } : { anyOf: capabilities };

const chatAccess = guildAccess(
  toGuildScopedCaller,
  ChatNotFound,
  ChatAccessDenied,
);

const chatAuthorization = Effect.map(OrganizationContextLookup, (lookup) =>
  ChatAuthorization.of({
    requireGuild: ({ guildId, allOf }) =>
      chatAccess(lookup, guildId, { allOf }),
  }),
);

const membersAccess = guildAccess(
  toGuildScopedCaller,
  MembersNotFound,
  MembersAccessDenied,
);

const membersAuthorization = Effect.map(OrganizationContextLookup, (lookup) =>
  MembersAuthorization.of({
    identity: requestScopedIdentity,
    requireGuild: ({ guildId, anyOf }) =>
      membersAccess(lookup, guildId, { anyOf }),
  }),
);

const organizationWorkspaceAccess = guildAccess(
  (access) => ({
    ...access.identity,
    guildId: access.context.guildId,
    ownerId: access.context.ownerId,
    permissions: access.context.permissions,
  }),
  OrganizationWorkspaceNotFound,
  OrganizationWorkspaceAccessDenied,
);

const organizationWorkspaceAuthorization = Effect.map(
  OrganizationContextLookup,
  (lookup) =>
    OrganizationWorkspaceAuthorization.of({
      identity: requestScopedIdentity,
      requireGuild: ({ guildId, allOf, anyOf }) =>
        organizationWorkspaceAccess(lookup, guildId, { allOf, anyOf }),
    }),
);

const accountOrganizationAccess = guildAccess(
  toGuildPermissionScope,
  AccountOrganizationNotFound,
  AccountOrganizationAccessDenied,
);

const accountOrganizationAuthorization = Effect.map(
  OrganizationContextLookup,
  (lookup) =>
    AccountOrganizationAuthorization.of({
      identity: requestScopedIdentity,
      requireGuild: ({ guildId, anyOf }) =>
        accountOrganizationAccess(lookup, guildId, { anyOf }),
    }),
);

const lootlogConfigAccess = guildAccess(
  toGuildScope,
  LootlogConfigAccessDenied,
  LootlogConfigAccessDenied,
);

const lootlogConfigAuthorization = Effect.map(
  OrganizationContextLookup,
  (lookup) =>
    LootlogConfigAuthorization.of({
      requireCapability: ({ guildId, capability }) =>
        lootlogConfigAccess(lookup, guildId, { allOf: [capability] }),
    }),
);

const docsAccess = guildAccess(
  toAuthorizedCaller,
  DocsNotFound,
  DocsAccessDenied,
);

const docsAuthorization = Effect.map(OrganizationContextLookup, (lookup) =>
  DocsAuthorization.of({
    requireGuild: ({ guildId, capabilities, mode }) =>
      docsAccess(lookup, guildId, capabilityRequirements(capabilities, mode)),
  }),
);

const eventsAccess = guildAccess(
  toAuthorizedCaller,
  EventsNotFound,
  EventsAccessDenied,
);

const eventsAuthorization = Effect.map(OrganizationContextLookup, (lookup) =>
  EventsAuthorization.of({
    requireGuild: ({ guildId, capabilities, mode }) =>
      eventsAccess(lookup, guildId, capabilityRequirements(capabilities, mode)),
  }),
);

const recordsAccess = guildAccess(
  toRoleScopedCaller,
  RecordsNotFound,
  RecordsAccessDenied,
);

const recordsAuthorization = Effect.map(OrganizationContextLookup, (lookup) =>
  RecordsAuthorization.of({
    requireCaller: requestScopedIdentity,
    requireGuild: ({ guildId, capability }) =>
      recordsAccess(lookup, guildId, { allOf: [capability] }),
  }),
);

const notificationsAccess = guildAccess(
  toRoleScopedCaller,
  NotificationsNotFound,
  NotificationsAccessDenied,
);

const notificationsAuthorization = Effect.map(
  OrganizationContextLookup,
  (lookup) =>
    NotificationsAuthorization.of({
      requireCaller: requestScopedIdentity,
      requireGuild: ({ guildId, capabilities }) =>
        notificationsAccess(lookup, guildId, { anyOf: capabilities }),
    }),
);

const mapTemplatesAccess = guildAccess(
  toGuildScope,
  MapTemplatesAccessDenied,
  MapTemplatesAccessDenied,
);

const mapTemplatesAuthorization = Effect.map(
  OrganizationContextLookup,
  (lookup) =>
    MapTemplatesAuthorization.of({
      requireCapability: ({ guildId, capability }) =>
        mapTemplatesAccess(lookup, guildId, { allOf: [capability] }),
    }),
);

const publicSystemAccess = guildAccess(
  toGuildScope,
  PublicSystemAccessDenied,
  PublicSystemAccessDenied,
);

const publicSystemAuthorization = Effect.map(
  OrganizationContextLookup,
  (lookup) =>
    PublicSystemAuthorization.of({
      requireCapability: ({ guildId, anyOf }) =>
        publicSystemAccess(lookup, guildId, { anyOf }),
    }),
);

// `TimersAuthorization` declares a mutable `roles` array, so the shared
// role-scoped projection is copied rather than passed through.
const timersAccess = guildAccess(
  (access) => ({
    ...toRoleScopedCaller(access),
    roles: [...access.context.roles],
  }),
  TimersNotFound,
  TimersAccessDenied,
);

const timersAuthorization = Effect.map(OrganizationContextLookup, (lookup) =>
  TimersAuthorization.of({
    identity: requestScopedIdentity,
    requireGuild: ({ guildId, capability }) =>
      timersAccess(lookup, guildId, { allOf: [capability] }),
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
