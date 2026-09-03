/** Authoritative composition root for the activity HTTP contract. */
import { HttpApi, OpenApi } from "effect/unstable/httpapi";
import { HealthGroup } from "./contracts/health/api.js";
import { GuildsGroup } from "./contracts/guilds/api.js";

export class ActivityApi extends HttpApi.make("ActivityApi")
  .annotate(OpenApi.Title, "Activity Logger API")
  .annotate(OpenApi.Version, "1.0")
  .annotate(OpenApi.Description, "The Activity Logger API documentation")
  .annotate(OpenApi.Servers, [])
  .add(HealthGroup, GuildsGroup) {}
