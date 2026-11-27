import { apiKeyEndpointPolicyLayer } from "@lootlog/protocol/http/api-key-http";
import { Layer } from "effect";
import { CatalogAccess } from "./catalog-access.js";
import { CatalogHandlers as CatalogGroupHandlers } from "./handlers/catalog.handlers.js";
import { FactsHandlers } from "./handlers/facts.handlers.js";
import { HealthHandlers } from "./handlers/health.handlers.js";
import { ReportsHandlers } from "./handlers/reports.handlers.js";

export const CatalogHandlers = Layer.mergeAll(
  HealthHandlers,
  CatalogGroupHandlers,
  ReportsHandlers,
  FactsHandlers,
).pipe(
  Layer.provide(apiKeyEndpointPolicyLayer("catalog")),
  Layer.provide(CatalogAccess.layer),
);
