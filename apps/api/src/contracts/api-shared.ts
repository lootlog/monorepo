import { ReauthenticationRequired } from "@lootlog/protocol/http/errors";
import { JsonValue } from "@lootlog/schema/http-scalars";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { BearerSecurity } from "@lootlog/protocol/http/bearer-security";
import { HttpApiMiddleware } from "effect/http-api";

export class BearerSecurityMiddleware extends HttpApiMiddleware.Service<
  BearerSecurityMiddleware,
  { provides: ForwardAuthIdentity }
>()("bearer security", {
  security: { bearer: BearerSecurity },
  error: ReauthenticationRequired,
}) {}

export type JsonValue = typeof JsonValue.Type;
