import type { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import {
  type OrganizationWorkspaceIdentity,
  OrganizationWorkspaceOperationError,
} from "#src/guilds/organization-workspace-access";

import { statusCodeResponse } from "#src/shared/http/handler-response";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import { applicationErrorResponse } from "#src/http-api/application-error-response";

import type { Permission as PermissionValue } from "@lootlog/schema/permissions";

import {
  ApplicationError,
  applicationErrorStatus,
  type ReauthenticationRequired,
  reauthenticationRequiredResponse,
} from "@lootlog/protocol/http/errors";

export type OrganizationWorkspaceGuildAccess = OrganizationWorkspaceIdentity & {
  readonly guildId: string;
  readonly ownerId: string;
  readonly permissions: ReadonlyArray<PermissionValue>;
};

export class OrganizationWorkspaceAccessDenied extends TaggedErrorClass<
  OrganizationWorkspaceAccessDenied,
  { readonly brand: unique symbol }
>()("OrganizationWorkspaceAccessDenied", {
  status: Schema.Literals([401, 403]),
  code: Schema.String,
}) {}

export class OrganizationWorkspaceNotFound extends TaggedErrorClass<
  OrganizationWorkspaceNotFound,
  { readonly brand: unique symbol }
>()("OrganizationWorkspaceNotFound", {
  status: Schema.Literal(404),
  code: Schema.String,
}) {}

type AccessFailure =
  | OrganizationWorkspaceAccessDenied
  | OrganizationWorkspaceNotFound
  | ReauthenticationRequired;

export class OrganizationWorkspaceAuthorization extends Context.Service<
  OrganizationWorkspaceAuthorization,
  {
    readonly identity: Effect.Effect<
      OrganizationWorkspaceIdentity,
      OrganizationWorkspaceAccessDenied,
      ForwardAuthIdentity
    >;
    readonly requireGuild: (options: {
      readonly guildId: string;
      readonly allOf?: ReadonlyArray<PermissionValue>;
      readonly anyOf?: ReadonlyArray<PermissionValue>;
    }) => Effect.Effect<
      OrganizationWorkspaceGuildAccess,
      AccessFailure,
      ForwardAuthIdentity
    >;
  }
>()("@lootlog/api/http-api/organization-workspace/authorization") {}

export const identity = Effect.flatMap(
  OrganizationWorkspaceAuthorization,
  (authorization) => authorization.identity,
);

export const requireGuild = (
  guildId: string,
  permissions:
    | ReadonlyArray<PermissionValue>
    | {
        readonly allOf?: ReadonlyArray<PermissionValue>;
        readonly anyOf?: ReadonlyArray<PermissionValue>;
      },
) =>
  Effect.flatMap(OrganizationWorkspaceAuthorization, (authorization) =>
    authorization.requireGuild({
      guildId,
      ...(Array.isArray(permissions) ? { allOf: permissions } : permissions),
    }),
  );

export const decode = <A, I, R>(
  schema: Schema.Codec<A, I, R>,
  value: unknown,
) =>
  Schema.decodeUnknownEffect(schema)(value).pipe(
    Effect.mapError(
      (cause) => new OrganizationWorkspaceOperationError({ cause }),
    ),
  );

type OrganizationWorkspaceFailure =
  | OrganizationWorkspaceAccessDenied
  | OrganizationWorkspaceNotFound
  | OrganizationWorkspaceOperationError
  | ReauthenticationRequired;

export const toOrganizationWorkspaceHttpResponse = <A, R>(
  effect: Effect.Effect<A, OrganizationWorkspaceFailure, R>,
) =>
  Effect.catchTags(effect, {
    OrganizationWorkspaceAccessDenied: statusCodeResponse,
    ReauthenticationRequired: reauthenticationRequiredResponse,
    OrganizationWorkspaceNotFound: statusCodeResponse,
    OrganizationWorkspaceOperationError: ({ cause }) => {
      if (Schema.is(ApplicationError)(cause)) {
        const status = applicationErrorStatus(cause);

        if (status < 500) return applicationErrorResponse(cause);
      }

      return Effect.die(cause);
    },
  });
