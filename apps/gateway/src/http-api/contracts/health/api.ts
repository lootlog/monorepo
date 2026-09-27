/** Endpoints owned by the health HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";
import { GatewayHealth, GatewayReady, GatewayUnavailable } from "./schemas.js";

export class HealthGroup extends HttpApiGroup.make("health")
  .add(
    HttpApiEndpoint.get("GatewayHealth", "/healthz", {
      success: GatewayHealth,
    })
      .annotate(OpenApi.Summary, "Liveness check")
      .annotate(
        OpenApi.Description,
        "Reports that the process serves HTTP. Dependency failures never fail liveness.",
      ),
  )
  .add(
    HttpApiEndpoint.get("GatewayReadiness", "/readyz", {
      success: GatewayReady,
      error: GatewayUnavailable,
    })
      .annotate(OpenApi.Summary, "Readiness check")
      .annotate(
        OpenApi.Description,
        "Reports whether this instance accepts new WebSocket sessions: it is subscribed to realtime federation and not draining.",
      ),
  ) {}
