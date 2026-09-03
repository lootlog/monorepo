/** Authoritative composition root for the gateway HTTP contract. */
import { HttpApi, OpenApi } from "effect/unstable/httpapi";
import { HealthGroup } from "./contracts/health/api.js";

export class GatewayApi extends HttpApi.make("GatewayApi")
  .annotate(OpenApi.Title, "Realtime Gateway API")
  .annotate(OpenApi.Version, "1.0")
  .add(HealthGroup) {}
