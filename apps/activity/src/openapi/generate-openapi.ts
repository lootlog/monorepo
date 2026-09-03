import {
  preserveOpenApi30Contract,
  setOpenApiCompatibilityValue,
} from "@lootlog/schema/openapi-compatibility";
import { OpenApi } from "effect/unstable/httpapi";
import { stringify } from "yaml";
import { ActivityApi } from "#src/http-api/activity-api";

const document = OpenApi.fromApi(ActivityApi);
const boundedInteger = (
  minimum: number,
  maximum: number,
  defaultValue: number,
) => ({
  schema: { type: "integer", minimum, maximum, default: defaultValue },
});
preserveOpenApi30Contract(
  document,
  {
    "ActivitiesController_findByGuild:limit": boundedInteger(1, 100, 50),
    "ActivitiesController_suggestActorNames:limit": boundedInteger(1, 50, 10),
    "ActivitiesController_suggestWorlds:limit": boundedInteger(1, 50, 20),
    "ActivitiesController_suggestClanNames:limit": boundedInteger(1, 50, 10),
    "ActivitiesController_findByUser:limit": boundedInteger(1, 100, 50),
  },
  {
    "HealthzController_check:200":
      "Service is healthy\n\nThe Health Check is successful",
    "HealthzController_check:503":
      "Service is unhealthy\n\nThe Health Check is not successful",
    "ActivitiesController_findOne:404": "Activity not found",
    "ActivitiesController_deleteActivity:404": "Activity not found",
  },
);
setOpenApiCompatibilityValue(
  document,
  [
    "paths",
    "/healthz",
    "get",
    "responses",
    "503",
    "content",
    "application/json",
    "schema",
    "properties",
    "error",
    "example",
  ],
  { redis: { status: "down", message: "Could not connect" } },
);
setOpenApiCompatibilityValue(
  document,
  [
    "paths",
    "/healthz",
    "get",
    "responses",
    "503",
    "content",
    "application/json",
    "schema",
    "properties",
    "details",
    "example",
  ],
  {
    database: { status: "up" },
    redis: { status: "down", message: "Could not connect" },
  },
);
for (const schemaName of [
  "PaginatedActivitiesResponseDto",
  "ActivityResponseDto",
] as const) {
  const prefix = ["components", "schemas", schemaName, "properties"];
  const detailsPath =
    schemaName === "PaginatedActivitiesResponseDto"
      ? [
          ...prefix,
          "data",
          "items",
          "properties",
          "details",
          "additionalProperties",
        ]
      : [...prefix, "details", "additionalProperties"];
  setOpenApiCompatibilityValue(document, detailsPath, {});
}
const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
  "trace",
] as const;
const operationIds = Object.values(document.paths).flatMap((path) =>
  HTTP_METHODS.flatMap((method) => {
    const operation = path[method];
    return operation?.operationId === undefined ? [] : [operation.operationId];
  }),
);
if (operationIds.length !== 9 || new Set(operationIds).size !== 9) {
  throw new Error("Activity OpenAPI requires 9 unique operations");
}
await Bun.write(
  new URL("../../openapi.yaml", import.meta.url),
  stringify(document, { lineWidth: 0 }),
);
