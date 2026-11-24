import { ApiKeyEndpointPolicy } from "@lootlog/protocol/http/api-key-http";
import { SchemaErrorResponse } from "@lootlog/protocol/http/schema-error-response";
import { healthGroup } from "@lootlog/instrumentation/service";
import { HttpApi, OpenApi } from "effect/http-api";
import { BattlesGroup } from "./contracts/battles/api.js";
import { PublicBattlesGroup } from "./contracts/public-battles/api.js";
import { WeaponKillsGroup } from "./contracts/weapon-kills/api.js";

export class BattlelogApi extends HttpApi.make("BattlelogApi")
  .annotate(OpenApi.Title, "Battle Log API")
  .annotate(OpenApi.Version, "1.0")
  .annotate(
    OpenApi.Description,
    "Margonem battle logs, public battle links and battle statistics.",
  )
  .annotate(OpenApi.Servers, [])
  .add(healthGroup(), BattlesGroup, WeaponKillsGroup, PublicBattlesGroup)
  .middleware(ApiKeyEndpointPolicy)
  .middleware(SchemaErrorResponse) {}
