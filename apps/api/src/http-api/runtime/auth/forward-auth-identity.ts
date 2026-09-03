import { Context } from "effect";

export interface ForwardAuthIdentityValue {
  readonly userId: string;
  readonly discordId: string;
}

/** Request-scoped identity asserted by the first-party auth proxy. */
export class ForwardAuthIdentity extends Context.Service<
  ForwardAuthIdentity,
  ForwardAuthIdentityValue
>()("@lootlog/api/http-api/forward-auth-identity") {}
