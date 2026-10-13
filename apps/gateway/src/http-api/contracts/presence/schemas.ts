/** Transport schemas owned by the presence HTTP module. */
import {
  BasicPresence,
  PresenceSnapshot,
  PresenceWithLocation,
} from "@lootlog/protocol/realtime";
import { Schema, Struct } from "effect";
import { HttpApiSchema } from "effect/http-api";

// HTTP readers identify players by the internal User; Discord identities stay
// inside the realtime protocol.
export const OrganizationPresence = Schema.Struct({
  ...PresenceSnapshot.fields,
  presences: Schema.Array(
    Schema.Union([
      Schema.Struct(Struct.omit(PresenceWithLocation.fields, ["discordId"])),
      Schema.Struct(Struct.omit(BasicPresence.fields, ["discordId"])),
    ]),
  ),
}).annotate({ identifier: "OrganizationPresence" });

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
