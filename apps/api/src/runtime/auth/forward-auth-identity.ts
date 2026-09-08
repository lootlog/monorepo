import { Context, Effect } from "effect";

export interface ForwardAuthIdentityValue {
  readonly userId: string;
  readonly discordId: string;
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
  ({ discordId, userId }) => ({ discordId, userId }),
) as Effect.Effect<{ readonly discordId: string; readonly userId: string }>;
