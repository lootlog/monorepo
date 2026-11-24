import { ApiKeyEndpointPolicy } from "@lootlog/protocol/http/api-key-http";
import { SchemaErrorResponse } from "@lootlog/protocol/http/schema-error-response";
import { UsersGroup } from "./contracts/users/api.js";
import { HttpApi, OpenApi } from "effect/http-api";
import { HealthGroup } from "./contracts/health/api.js";
import { GuildsGroup } from "./contracts/guilds/api.js";

export class ActivityApi extends HttpApi.make("ActivityApi")
  .annotate(OpenApi.Title, "Activity Logger API")
  .annotate(OpenApi.Version, "1.0")
  .annotate(
    OpenApi.Description,
    "Organization activity history and players' confirmed game online time.",
  )
  .annotate(OpenApi.Servers, [])
  .add(HealthGroup, GuildsGroup, UsersGroup)
  .middleware(ApiKeyEndpointPolicy)
  .middleware(SchemaErrorResponse) {}
