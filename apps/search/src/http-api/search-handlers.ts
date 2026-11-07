import { apiKeyEndpointPolicyLayer } from "@lootlog/schema/api-key-http";
import { Layer } from "effect";
import { HealthHandlers } from "./handlers/health.handlers.js";
import { PlayersHandlers } from "./handlers/players.handlers.js";

export const SearchHandlers = Layer.mergeAll(
  HealthHandlers,
  PlayersHandlers,
).pipe(Layer.provide(apiKeyEndpointPolicyLayer("search")));
