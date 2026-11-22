import { healthGroup } from "@lootlog/instrumentation/service";
import { ApiKeyEndpointPolicy } from "@lootlog/protocol/http/api-key-http";
import { SchemaErrorResponse } from "@lootlog/protocol/http/schema-error-response";
import { HttpApi, OpenApi } from "effect/http-api";
import { CatalogAccess } from "./catalog-access.js";
import { CatalogGroup } from "./contracts/catalog/api.js";
import { CatalogReportsGroup } from "./contracts/reports/api.js";

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
    CatalogReportsGroup,
  )
  .middleware(CatalogAccess)
  .middleware(ApiKeyEndpointPolicy)
  .middleware(SchemaErrorResponse) {}
