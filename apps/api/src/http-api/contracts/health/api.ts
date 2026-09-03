/** Endpoints owned by the health HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
export class HealthGroup extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("HealthzControllerHealthCheck", "/healthz", {
    success: HttpApiSchema.Empty(200),
  })
    .annotate(OpenApi.Identifier, "HealthzController_healthCheck")
    .annotate(OpenApi.Summary, "Health check")
    .annotate(OpenApi.Description, "Check the health status of the API"),
) {}
