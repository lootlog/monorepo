/** Authoritative composition root for the discord-bot HTTP contract. */
import { HttpApi, OpenApi } from "effect/unstable/httpapi";
import { HealthGroup } from "./contracts/health/api.js";
import { InternalGroup } from "./contracts/internal/api.js";

export class DiscordBotApi extends HttpApi.make("DiscordBotApi")
  .annotate(OpenApi.Title, "Discord Bot API")
  .annotate(OpenApi.Version, "1.0")
  .add(HealthGroup, InternalGroup) {}
