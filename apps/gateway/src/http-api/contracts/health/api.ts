/** Endpoints owned by the health HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";
import { GatewayHealth } from "./schemas.js";

export class HealthGroup extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("GatewayHealth", "/healthz", {
    success: GatewayHealth,
  }).annotate(OpenApi.Summary, "Health check"),
) {}
