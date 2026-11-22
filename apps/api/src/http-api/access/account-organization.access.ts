import {
  type AuthenticatedIdentity,
  AccountOrganizationOperationError,
  AccountOrganizationData,
} from "#src/guilds/account-organization-data";

import { statusCodeResponse } from "#src/shared/http/handler-response";

import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Cause, Context, Effect, Predicate, Schema } from "effect";
import { applicationErrorResponse } from "../application-error-response.js";
import { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import { SqlError } from "effect/sql/SqlError";

import type { Permission as PermissionValue } from "@lootlog/schema/permissions";

import {
  ResourceConflictError,
  type ReauthenticationRequired,
  reauthenticationRequiredResponse,
} from "@lootlog/protocol/http/errors";

import { ErrorKey } from "#src/guilds/error-key";

export type AuthorizedGuild = {
  readonly guildId: string;
  readonly permissions: ReadonlyArray<PermissionValue>;
};

export class AccountOrganizationAccessDenied extends TaggedErrorClass<
  AccountOrganizationAccessDenied,
  { readonly brand: unique symbol }
>()("AccountOrganizationAccessDenied", {
  status: Schema.Literals([401, 403]),
  code: Schema.String,
}) {}

export class AccountOrganizationNotFound extends TaggedErrorClass<
  AccountOrganizationNotFound,
  { readonly brand: unique symbol }
>()("AccountOrganizationNotFound", {
  status: Schema.Literal(404),
  code: Schema.String,
}) {}

type AuthorizationFailure =
  | AccountOrganizationAccessDenied
  | AccountOrganizationNotFound
  | ReauthenticationRequired;

export class AccountOrganizationAuthorization extends Context.Service<
  AccountOrganizationAuthorization,
  {
    readonly identity: Effect.Effect<
      AuthenticatedIdentity,
      AccountOrganizationAccessDenied
    >;
    readonly requireGuild: (options: {
      readonly guildId: string;
      readonly anyOf: ReadonlyArray<PermissionValue>;
    }) => Effect.Effect<AuthorizedGuild, AuthorizationFailure>;
  }
>()("@lootlog/api/http-api/account-organization/authorization") {}

export const decode = <A, I, R>(
  schema: Schema.Codec<A, I, R>,
  value: unknown,
) =>
  Schema.decodeUnknownEffect(schema)(value).pipe(
    Effect.mapError(
      (cause) => new AccountOrganizationOperationError({ cause }),
    ),
  );

export const identity = Effect.flatMap(
  AccountOrganizationAuthorization,
  (authorization) => authorization.identity,
);

export const data = <A>(
  operation: (
    service: AccountOrganizationData["Service"],
  ) => Effect.Effect<A, AccountOrganizationOperationError>,
) => Effect.flatMap(AccountOrganizationData, operation);

export const authorizeGuild = (
  guildId: string,
  anyOf: ReadonlyArray<PermissionValue>,
) =>
  Effect.flatMap(AccountOrganizationAuthorization, (authorization) =>
    authorization.requireGuild({ guildId, anyOf }),
  );

type AccountOrganizationFailure =
  | AccountOrganizationAccessDenied
  | AccountOrganizationNotFound
  | AccountOrganizationOperationError
  | ReauthenticationRequired;

export const toAccountOrganizationHttpResponse = <A, R>(
  effect: Effect.Effect<A, AccountOrganizationFailure, R>,
) =>
  Effect.catchTags(effect, {
    AccountOrganizationAccessDenied: statusCodeResponse,
    ReauthenticationRequired: reauthenticationRequiredResponse,
    AccountOrganizationNotFound: statusCodeResponse,
    AccountOrganizationOperationError: (error) => {
      const cause = error.cause;
      let databaseCause: unknown;

      if (cause instanceof EffectDrizzleQueryError) {
        databaseCause = Cause.isCause(cause.cause)
          ? Cause.squash(cause.cause)
          : cause.cause;
      }

      if (
        databaseCause instanceof SqlError &&
        Predicate.isTagged(databaseCause.reason, "UniqueViolation") &&
        databaseCause.reason.constraint === "Guild_vanityUrl_key"
      ) {
        return applicationErrorResponse(
          new ResourceConflictError({
            code: ErrorKey.GUILDS_VANITY_URL_TAKEN,
          }),
        );
      }

      return applicationErrorResponse(cause);
    },
  });
