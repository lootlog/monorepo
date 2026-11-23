import { Context, Effect, Option } from "effect";
import type { ForwardAuthIdentityValue } from "@lootlog/schema/api-key-policy";

export class ForwardAuthIdentity extends Context.Service<
  ForwardAuthIdentity,
  ForwardAuthIdentityValue
>()("@lootlog/api/http-api/forward-auth-identity") {}

export const requestScopedIdentity = Effect.service(ForwardAuthIdentity);

export const requestApiKeyCaller = Effect.map(
  Effect.serviceOption(ForwardAuthIdentity),
  (identity) => {
    const caller = Option.getOrUndefined(identity);

    return caller?.apiKey ? caller : undefined;
  },
);

export const requestApiKeyAccess = Effect.map(
  requestApiKeyCaller,
  (caller) => caller?.apiKey,
);
