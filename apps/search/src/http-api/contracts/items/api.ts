import { SearchUnavailable } from "../search-unavailable.js";
/** Endpoints owned by the items HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import {
  ItemsControllerGetItems200,
  ItemsControllerGetItemsQuery,
} from "./schemas.js";

export class ItemsGroup extends HttpApiGroup.make("Items").add(
  HttpApiEndpoint.get("ItemsControllerGetItems", "/items", {
    error: SearchUnavailable.pipe(HttpApiSchema.status(503)),
    query: ItemsControllerGetItemsQuery,
    success: ItemsControllerGetItems200,
  })
    .annotate(OpenApi.Identifier, "ItemsController_getItems")
    .annotate(
      OpenApi.Summary,
      "Search items with filters, sorting, and facets",
    ),
) {}
