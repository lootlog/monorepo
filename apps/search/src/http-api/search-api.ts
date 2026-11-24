import { healthGroup } from "@lootlog/instrumentation/service";
import { ApiKeyEndpointPolicy } from "@lootlog/protocol/http/api-key-http";
import { SchemaErrorResponse } from "@lootlog/protocol/http/schema-error-response";
import { HttpApi, OpenApi } from "effect/http-api";
import { PlayersGroup } from "./contracts/players/api.js";

export class SearchApi extends HttpApi.make("SearchApi")
  .annotate(OpenApi.Title, "Search API")
  .annotate(OpenApi.Version, "1.0")
  .annotate(OpenApi.Description, "Search Margonem players by name.")
  .annotate(OpenApi.Servers, [])
  .add(healthGroup(), PlayersGroup)
  .middleware(ApiKeyEndpointPolicy)
  .middleware(SchemaErrorResponse) {}
