import { relative } from "node:path";
import { API_SERVICE_NAMES } from "@lootlog/schema/api-services";
import {
  assertNoGeneratedDrift,
  repositoryRoot,
  serviceSpecPath,
} from "./generation";

assertNoGeneratedDrift(
  [
    ...API_SERVICE_NAMES.map((service) =>
      relative(repositoryRoot, serviceSpecPath(service)),
    ),
    // The root `client:generate` also writes these specifications. They have
    // no generated client: only internal and WebSocket callers use them.
    "apps/discord-bot/openapi.yaml",
    "apps/gateway/openapi.yaml",
    "packages/client/src/generated",
  ],
  "Generated API clients or OpenAPI specifications",
);
