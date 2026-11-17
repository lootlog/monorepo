import { Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { JsonValue } from "@lootlog/schema/http-scalars";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { HttpApiMiddleware, HttpApiSecurity, OpenApi } from "effect/http-api";

const BearerSecurity = HttpApiSecurity.bearer.pipe(
  HttpApiSecurity.annotate(OpenApi.Format, "JWT"),
);

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

/**
 * Body of every 4xx/5xx response except the 401 that asks for sign-in again.
 * `code` is the stable, machine-readable reason (`NOT_FOUND`,
 * `VALIDATION_ERROR`, `RESERVATION_OVERLAP`); `message` is for people and may
 * change; `details` holds the values a client needs to explain the reason.
 * A 429 also sends `Retry-After` in seconds when the wait is known.
 */
export const HttpErrorResponse = Schema.Struct({
  code: Schema.String,
  message: Schema.optional(Schema.String),
  details: Schema.optional(Schema.Record(Schema.String, JsonValue)),
}).annotate({ identifier: "HttpErrorResponse" });

export type HttpErrorResponse = typeof HttpErrorResponse.Type;

export type JsonValue = typeof JsonValue.Type;
