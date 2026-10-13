/** Transport schemas owned by the presence HTTP module. */
import { Schema } from "effect";
import { HttpApiSchema } from "effect/http-api";

export const OrganizationPresencePath = Schema.Struct({
  organizationId: Schema.NonEmptyString,
});

export const OrganizationPresenceQuery = Schema.Struct({
  world: Schema.optional(Schema.NonEmptyString),
});

export const PresenceUnauthorized = Schema.Struct({
  code: Schema.Literal("UNAUTHORIZED"),
})
  .annotate({ identifier: "PresenceUnauthorized" })
  .pipe(HttpApiSchema.status(401));

export const PresenceForbidden = Schema.Struct({
  code: Schema.Literal("FORBIDDEN"),
})
  .annotate({ identifier: "PresenceForbidden" })
  .pipe(HttpApiSchema.status(403));

export const PresenceUnavailable = Schema.Struct({
  code: Schema.Literal("UNAVAILABLE"),
})
  .annotate({ identifier: "PresenceUnavailable" })
  .pipe(HttpApiSchema.status(503));
