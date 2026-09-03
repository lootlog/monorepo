/** Authoritative composition root for the battlelog HTTP contract. */
import { HttpApi, OpenApi } from "effect/unstable/httpapi";
import { HealthGroup } from "./contracts/health/api.js";
import { BattlesGroup } from "./contracts/battles/api.js";
import { PublicBattlesGroup } from "./contracts/public-battles/api.js";
import { InternalGroup } from "./contracts/internal/api.js";

export class BattlelogApi extends HttpApi.make("BattlelogApi")
  .annotate(OpenApi.Title, "Battle Log API")
  .annotate(OpenApi.Version, "1.0")
  .annotate(OpenApi.Description, "The Battle Log API documentation")
  .annotate(OpenApi.Servers, [])
  .add(HealthGroup, BattlesGroup, PublicBattlesGroup, InternalGroup) {}
