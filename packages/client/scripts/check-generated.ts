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
    "apps/discord-bot/openapi.yaml",
    "apps/gateway/openapi.yaml",
    "packages/client/src/generated",
  ],
  "Generated API clients or OpenAPI specifications",
);
