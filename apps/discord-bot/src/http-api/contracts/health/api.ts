/** Endpoints owned by the health HTTP module. */
import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";

export class HealthGroup extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("DiscordBotHealth", "/healthz", {
    success: Schema.Literal("OK").pipe(HttpApiSchema.asText()),
  }).annotate(OpenApi.Summary, "Health check"),
) {}
