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

export const requestScopedIdentity = Effect.map(
  ForwardAuthIdentity,
  ({ discordId, userId }) => ({ discordId, userId }),
) as Effect.Effect<{ readonly discordId: string; readonly userId: string }>;
