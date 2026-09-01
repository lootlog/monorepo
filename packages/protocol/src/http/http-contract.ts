import { NonEmptyString } from "@lootlog/schema/primitives";
import { Schema } from "effect";
import {
  HttpApi,
  HttpApiMiddleware,
  HttpApiSecurity,
} from "effect/unstable/httpapi";

/* oxlint-disable unicorn/throw-new-error -- Effect TaggedError is a class factory. */

export class BadRequest extends Schema.TaggedError<BadRequest>()(
  "BadRequest",
  {
    code: NonEmptyString,
    message: NonEmptyString,
    details: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  },
  { httpApiStatus: 400 },
) {}

export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {
    code: NonEmptyString,
    message: NonEmptyString,
  },
  { httpApiStatus: 401 },
) {}

export class Forbidden extends Schema.TaggedError<Forbidden>()(
  "Forbidden",
  {
    code: NonEmptyString,
    message: NonEmptyString,
  },
  { httpApiStatus: 403 },
) {}

export class NotFound extends Schema.TaggedError<NotFound>()(
  "NotFound",
  {
    code: NonEmptyString,
    message: NonEmptyString,
  },
  { httpApiStatus: 404 },
) {}

export class Conflict extends Schema.TaggedError<Conflict>()(
  "Conflict",
  {
    code: NonEmptyString,
    message: NonEmptyString,
  },
  { httpApiStatus: 409 },
) {}

export class ServiceUnavailable extends Schema.TaggedError<ServiceUnavailable>()(
  "ServiceUnavailable",
  {
    code: NonEmptyString,
    message: NonEmptyString,
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
