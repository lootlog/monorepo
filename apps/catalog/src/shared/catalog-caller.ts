import {
  AuthenticationRequiredError,
  PermissionDeniedError,
} from "@lootlog/protocol/http/errors";
import { readForwardAuthIdentity } from "@lootlog/schema/api-key-policy";
import {
  hasPlatformRole,
  readForwardedPlatformRoles,
  type PlatformRole,
} from "@lootlog/schema/platform-roles";
import { Effect } from "effect";
import { HttpServerRequest } from "effect/http";

export type CatalogCaller = {
  readonly userId: string;
  readonly roles: ReadonlyArray<PlatformRole>;
};

export const forwardedCatalogCaller = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const identity = readForwardAuthIdentity(request.headers);

  if (!identity) return yield* new AuthenticationRequiredError();

  return {
    userId: identity.userId,
    roles: readForwardedPlatformRoles(request.headers),
  } satisfies CatalogCaller;
});

export const isCatalogModerator = (caller: CatalogCaller) =>
  hasPlatformRole(caller.roles, "wiki-moderator");

export const requireCatalogModerator = (caller: CatalogCaller) =>
  isCatalogModerator(caller)
    ? Effect.void
    : Effect.fail(new PermissionDeniedError("Catalog moderators only"));
