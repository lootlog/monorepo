import { Context, Effect, Option } from "effect";
import type { ApiKeyAccess } from "@lootlog/schema/api-key-access";

export interface ForwardAuthIdentityValue {
  readonly userId: string;
  readonly discordId: string;
  readonly apiKey?: ApiKeyAccess;
}

/** Request-scoped identity asserted by the first-party auth proxy. */
export class ForwardAuthIdentity extends Context.Service<
  ForwardAuthIdentity,
  ForwardAuthIdentityValue
>()("@lootlog/api/http-api/forward-auth-identity") {}

// SAFETY: forwardAuthMiddleware supplies ForwardAuthIdentity around every authenticated
// handler effect before these request-only authorization ports run. The port interfaces
// deliberately keep this middleware-provided requirement ambient.
export const requestScopedIdentity = Effect.map(
  ForwardAuthIdentity,
  (identity) => identity,
) as Effect.Effect<ForwardAuthIdentityValue>;

/** Background jobs have no request identity and retain their own domain scope. */
export const requestApiKeyAccess = Effect.map(
  Effect.serviceOption(ForwardAuthIdentity),
  (identity) => Option.getOrUndefined(identity)?.apiKey,
);
