import { apiKeyEndpointPolicyLayer } from "@lootlog/schema/api-key-http";
import { Layer } from "effect";
import { CatalogAccess } from "./catalog-access.js";
import { CatalogHandlers as CatalogGroupHandlers } from "./handlers/catalog.handlers.js";
import { HealthHandlers } from "./handlers/health.handlers.js";
import { ItemsHandlers } from "./handlers/items.handlers.js";
import { NpcsHandlers } from "./handlers/npcs.handlers.js";

export const CatalogHandlers = Layer.mergeAll(
  HealthHandlers,
  NpcsHandlers,
  ItemsHandlers,
  CatalogGroupHandlers,
).pipe(
  Layer.provide(apiKeyEndpointPolicyLayer("catalog")),
  Layer.provide(CatalogAccess.layer),
);
