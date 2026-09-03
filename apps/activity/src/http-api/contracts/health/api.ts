/** Endpoints owned by the health HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import {
  HealthzControllerCheck200,
  HealthzControllerCheck503,
} from "./schemas.js";

export class HealthGroup extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("HealthzControllerCheck", "/healthz", {
    success: HealthzControllerCheck200,
    error: HealthzControllerCheck503.pipe(HttpApiSchema.status(503)),
  })
    .annotate(OpenApi.Identifier, "HealthzController_check")
    .annotate(OpenApi.Summary, "Health check")
    .annotate(
      OpenApi.Description,
      "Check the health status of the Activity service (database, API service, memory, disk)",
    ),
) {}
