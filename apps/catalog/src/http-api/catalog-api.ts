import { ApiKeyEndpointPolicy } from "@lootlog/schema/api-key-http";
/** Authoritative composition root for the catalog HTTP contract. */
import { HttpApi, OpenApi } from "effect/http-api";
import { CatalogAccess } from "./catalog-access.js";
import { CatalogGroup } from "./contracts/catalog/api.js";
import { HealthGroup } from "./contracts/health/api.js";

export class CatalogApi extends HttpApi.make("CatalogApi")
  .annotate(OpenApi.Title, "Catalog API")
  .annotate(OpenApi.Version, "1.0")
  .annotate(
    OpenApi.Description,
    "Margonem items and NPCs as Lootlog observed them",
  )
  .annotate(OpenApi.Servers, [])
  .add(HealthGroup, CatalogGroup)
  .middleware(CatalogAccess)
  .middleware(ApiKeyEndpointPolicy) {}
