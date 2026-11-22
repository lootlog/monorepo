import { SearchUnavailable } from "@lootlog/meilisearch/search-unavailable";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import {
  CatalogControllerGetEventsQuery,
  CatalogControllerGetIndexQuery,
  CatalogControllerGetItemsQuery,
  CatalogControllerGetNpcsQuery,
  CatalogEventsResponseDto_Output,
  CatalogIndexResponseDto_Output,
  CatalogItemsResponseDto_Output,
  CatalogNpcsResponseDto_Output,
} from "./schemas.js";

export class CatalogGroup extends HttpApiGroup.make("Catalog")
  .add(
    HttpApiEndpoint.get("CatalogControllerGetItems", "/catalog/items", {
      error: SearchUnavailable.pipe(HttpApiSchema.status(503)),
      query: CatalogControllerGetItemsQuery,
      success: CatalogItemsResponseDto_Output,
    })
      .annotate(OpenApi.Identifier, "CatalogController_getItems")
      .annotate(OpenApi.Summary, "List items in the public catalog"),
  )
  .add(
    HttpApiEndpoint.get("CatalogControllerGetNpcs", "/catalog/npcs", {
      error: SearchUnavailable.pipe(HttpApiSchema.status(503)),
      query: CatalogControllerGetNpcsQuery,
      success: CatalogNpcsResponseDto_Output,
    })
      .annotate(OpenApi.Identifier, "CatalogController_getNpcs")
      .annotate(OpenApi.Summary, "List NPCs in the public catalog"),
  )
  .add(
    HttpApiEndpoint.get("CatalogControllerGetEvents", "/catalog/events", {
      error: SearchUnavailable.pipe(HttpApiSchema.status(503)),
      query: CatalogControllerGetEventsQuery,
      success: CatalogEventsResponseDto_Output,
    })
      .annotate(OpenApi.Identifier, "CatalogController_getEvents")
      .annotate(OpenApi.Summary, "List events in the public catalog"),
  )
  .add(
    HttpApiEndpoint.get("CatalogControllerGetIndex", "/catalog/index", {
      error: SearchUnavailable.pipe(HttpApiSchema.status(503)),
      query: CatalogControllerGetIndexQuery,
      success: CatalogIndexResponseDto_Output,
    })
      .annotate(OpenApi.Identifier, "CatalogController_getIndex")
      .annotate(
        OpenApi.Summary,
        "List every item and NPC in the public catalog",
      ),
  ) {}
