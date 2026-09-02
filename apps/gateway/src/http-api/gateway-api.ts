import { Schema } from "effect";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";

export const GatewayHealth = Schema.Struct({
  status: Schema.Literal("ok"),
}).annotate({ identifier: "GatewayHealth" });

class HealthGroup extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("GatewayHealth", "/healthz", {
    success: GatewayHealth,
  }).annotate(OpenApi.Summary, "Health check"),
) {}

export class GatewayApi extends HttpApi.make("GatewayApi")
  .annotate(OpenApi.Title, "Realtime Gateway API")
  .annotate(OpenApi.Version, "1.0")
  .add(HealthGroup) {}
