/** Endpoints owned by the health HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import {
  HealthzControllerCheck200,
  ReadyzControllerCheck200,
  ReadyzControllerCheck503,
} from "./schemas.js";

export class HealthGroup extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("HealthzControllerCheck", "/healthz", {
    success: HealthzControllerCheck200,
  })
    .annotate(OpenApi.Identifier, "HealthzController_check")
    .annotate(OpenApi.Summary, "Liveness check")
    .annotate(
      OpenApi.Description,
      "Check that the Activity process and HTTP event loop respond without checking dependencies",
    ),
  HttpApiEndpoint.get("ReadyzControllerCheck", "/readyz", {
    success: ReadyzControllerCheck200,
    error: ReadyzControllerCheck503.pipe(HttpApiSchema.status(503)),
  })
    .annotate(OpenApi.Identifier, "ReadyzController_check")
    .annotate(OpenApi.Summary, "Readiness check")
    .annotate(
      OpenApi.Description,
      "Check the Activity service's direct PostgreSQL dependency with a three-second timeout; no other service health endpoints are called",
    ),
) {}
