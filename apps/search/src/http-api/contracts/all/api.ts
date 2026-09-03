/** Endpoints owned by the all HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";
import {
  AllControllerSearchAll200,
  AllControllerSearchAllQuery,
} from "./schemas.js";

export class AllGroup extends HttpApiGroup.make("All").add(
  HttpApiEndpoint.get("AllControllerSearchAll", "/all", {
    query: AllControllerSearchAllQuery,
    success: AllControllerSearchAll200,
  })
    .annotate(OpenApi.Identifier, "AllController_searchAll")
    .annotate(OpenApi.Summary, "Search across all categories"),
) {}
