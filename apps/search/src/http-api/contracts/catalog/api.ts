import { SearchUnavailable } from "../search-unavailable.js";
/** Endpoints owned by the public catalog HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import {
  CatalogControllerGetItemsQuery,
  CatalogControllerGetNpcsQuery,
  CatalogItemsResponseDto_Output,
  CatalogNpcsResponseDto_Output,
} from "./schemas.js";

/**
 * Game facts anyone may read without signing in: items, the NPCs they drop
 * from and when Lootlog first saw them. No player, world or Organization
 * appears here, and first sightings are days, not times.
 */
export class CatalogGroup extends HttpApiGroup.make("Catalog")
  .add(
    HttpApiEndpoint.get("CatalogControllerGetItems", "/public/catalog/items", {
      error: SearchUnavailable.pipe(HttpApiSchema.status(503)),
      query: CatalogControllerGetItemsQuery,
      success: CatalogItemsResponseDto_Output,
    })
      .annotate(OpenApi.Identifier, "CatalogController_getItems")
      .annotate(OpenApi.Summary, "List items in the public catalog"),
  )
  .add(
    HttpApiEndpoint.get("CatalogControllerGetNpcs", "/public/catalog/npcs", {
      error: SearchUnavailable.pipe(HttpApiSchema.status(503)),
      query: CatalogControllerGetNpcsQuery,
      success: CatalogNpcsResponseDto_Output,
    })
      .annotate(OpenApi.Identifier, "CatalogController_getNpcs")
      .annotate(OpenApi.Summary, "List NPCs in the public catalog"),
  ) {}
