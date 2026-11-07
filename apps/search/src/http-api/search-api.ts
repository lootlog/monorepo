import { ApiKeyEndpointPolicy } from "@lootlog/schema/api-key-http";
/** Authoritative composition root for the search HTTP contract. */
import { HttpApi, OpenApi } from "effect/http-api";
import { HealthGroup } from "./contracts/health/api.js";
import { PlayersGroup } from "./contracts/players/api.js";

export class SearchApi extends HttpApi.make("SearchApi")
  .annotate(OpenApi.Title, "Search API")
  .annotate(OpenApi.Version, "1.0")
  .annotate(OpenApi.Description, "Player search")
  .annotate(OpenApi.Servers, [])
  .add(HealthGroup, PlayersGroup)
  .middleware(ApiKeyEndpointPolicy) {}
