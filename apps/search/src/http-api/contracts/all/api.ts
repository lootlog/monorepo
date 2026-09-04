import { SearchUnavailable } from "../search-unavailable.js";
/** Endpoints owned by the all HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import {
  AllControllerSearchAll200,
  AllControllerSearchAllQuery,
} from "./schemas.js";

export class AllGroup extends HttpApiGroup.make("All").add(
  HttpApiEndpoint.get("AllControllerSearchAll", "/all", {
    error: SearchUnavailable.pipe(HttpApiSchema.status(503)),
    query: AllControllerSearchAllQuery,
    success: AllControllerSearchAll200,
  })
    .annotate(OpenApi.Identifier, "AllController_searchAll")
    .annotate(OpenApi.Summary, "Search across all categories"),
) {}
