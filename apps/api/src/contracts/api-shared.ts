import { Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { JsonValue } from "@lootlog/schema/http-scalars";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { BearerSecurity } from "@lootlog/protocol/http/bearer-security";
import { HttpApiMiddleware } from "effect/http-api";

/**
 * The caller's Discord authorization no longer works, so Lootlog cannot resolve
 * their Organization membership. `requiresReauth` starts the Web app's sign-in
 * flow; `code` names the failed step, such as `DISCORD_UNAUTHORIZED`.
 */
export class ReauthenticationRequired extends TaggedErrorClass<ReauthenticationRequired>()(
  "ReauthenticationRequired",
  { code: Schema.String, requiresReauth: Schema.Literal(true) },
  { httpApiStatus: 401 },
) {}

export class BearerSecurityMiddleware extends HttpApiMiddleware.Service<
  BearerSecurityMiddleware,
  { provides: ForwardAuthIdentity }
>()("bearer security", {
  security: { bearer: BearerSecurity },
  error: ReauthenticationRequired,
}) {}

export type JsonValue = typeof JsonValue.Type;
