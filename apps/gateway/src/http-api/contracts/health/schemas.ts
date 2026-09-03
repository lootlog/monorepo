/** Transport schemas owned by the health HTTP module. */
import { Schema } from "effect";

export const GatewayHealth = Schema.Struct({
  status: Schema.Literal("ok"),
}).annotate({ identifier: "GatewayHealth" });
