import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Schema } from "effect";
import {
  HttpApi,
  HttpApiMiddleware,
  HttpApiSecurity,
} from "effect/unstable/httpapi";

export class BadRequest extends TaggedErrorClass<BadRequest>()(
  "BadRequest",
  {
    code: Schema.NonEmptyString,
    message: Schema.NonEmptyString,
    details: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  },
  { httpApiStatus: 400 },
) {}

export class Unauthorized extends TaggedErrorClass<Unauthorized>()(
  "Unauthorized",
  {
    code: Schema.NonEmptyString,
    message: Schema.NonEmptyString,
  },
  { httpApiStatus: 401 },
) {}

export class Forbidden extends TaggedErrorClass<Forbidden>()(
  "Forbidden",
  {
    code: Schema.NonEmptyString,
    message: Schema.NonEmptyString,
  },
  { httpApiStatus: 403 },
) {}

export class NotFound extends TaggedErrorClass<NotFound>()(
  "NotFound",
  {
    code: Schema.NonEmptyString,
    message: Schema.NonEmptyString,
  },
  { httpApiStatus: 404 },
) {}

export class Conflict extends TaggedErrorClass<Conflict>()(
  "Conflict",
  {
    code: Schema.NonEmptyString,
    message: Schema.NonEmptyString,
  },
  { httpApiStatus: 409 },
) {}

export class ServiceUnavailable extends TaggedErrorClass<ServiceUnavailable>()(
  "ServiceUnavailable",
  {
    code: Schema.NonEmptyString,
    message: Schema.NonEmptyString,
    retryAfterSeconds: Schema.optional(Schema.Int),
  },
  { httpApiStatus: 503 },
) {}

export class SessionAuthorization extends HttpApiMiddleware.Service<SessionAuthorization>()(
  "@lootlog/protocol/http/SessionAuthorization",
  {
    requiredForClient: true,
    security: {
      session: HttpApiSecurity.apiKey({
        key: "lootlog.sid",
        in: "cookie",
      }),
    },
    error: Unauthorized,
  },
) {}

export class BearerAuthorization extends HttpApiMiddleware.Service<BearerAuthorization>()(
  "@lootlog/protocol/http/BearerAuthorization",
  {
    requiredForClient: true,
    security: { bearer: HttpApiSecurity.bearer },
    error: Unauthorized,
  },
) {}

/**
 * Empty schema-first API value intended to be extended by each deployable app.
 * It deliberately declares no routes, so adopting it cannot change an existing
 * HTTP method, path, operation id, or response status.
 */
export const LootlogHttpApiBase = HttpApi.make("lootlog");
