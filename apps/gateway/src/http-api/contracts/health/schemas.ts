/** Transport schemas owned by the health HTTP module. */
import { Schema } from "effect";
import { HttpApiSchema } from "effect/http-api";

export const GatewayHealth = Schema.Struct({
  status: Schema.Literal("ok"),
}).annotate({ identifier: "GatewayHealth" });

export const GatewayReady = Schema.Struct({
  status: Schema.Literal("ready"),
}).annotate({ identifier: "GatewayReady" });

export const GatewayUnavailable = Schema.Struct({
  status: Schema.Literal("unavailable"),
  reason: Schema.Literals(["draining", "federation-unavailable"]),
})
  .annotate({ identifier: "GatewayUnavailable" })
  .pipe(HttpApiSchema.status(503));
