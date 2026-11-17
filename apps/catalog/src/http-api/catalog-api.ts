import { healthGroup } from "@lootlog/instrumentation/service";
import { ApiKeyEndpointPolicy } from "@lootlog/schema/api-key-http";
/** Authoritative composition root for the catalog HTTP contract. */
import { HttpApi, OpenApi } from "effect/http-api";
import { CatalogAccess } from "./catalog-access.js";
import { CatalogGroup } from "./contracts/catalog/api.js";

export class CatalogApi extends HttpApi.make("CatalogApi")
  .annotate(OpenApi.Title, "Catalog API")
  .annotate(OpenApi.Version, "1.0")
  .annotate(
    OpenApi.Description,
    "Margonem items and NPCs as Lootlog observed them",
  )
  .annotate(OpenApi.Servers, [])
  .add(
    healthGroup("Check the health status of the catalog service"),
    CatalogGroup,
  )
  .middleware(CatalogAccess)
  .middleware(ApiKeyEndpointPolicy) {}
