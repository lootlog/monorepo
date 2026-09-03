/** Authoritative composition root for the search HTTP contract. */
import { HttpApi, OpenApi } from "effect/unstable/httpapi";
import { HealthGroup } from "./contracts/health/api.js";
import { PlayersGroup } from "./contracts/players/api.js";
import { NPCsGroup } from "./contracts/npcs/api.js";
import { ItemsGroup } from "./contracts/items/api.js";
import { AllGroup } from "./contracts/all/api.js";

export class SearchApi extends HttpApi.make("SearchApi")
  .annotate(OpenApi.Title, "Search API")
  .annotate(OpenApi.Version, "1.0")
  .annotate(OpenApi.Description, "Meilisearch-powered search microservice")
  .annotate(OpenApi.Servers, [])
  .add(HealthGroup, PlayersGroup, NPCsGroup, ItemsGroup, AllGroup) {}
