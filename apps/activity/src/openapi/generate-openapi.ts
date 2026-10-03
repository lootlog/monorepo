import {
  preserveOpenApi30Contract,
  setOpenApiCompatibilityValue,
} from "@lootlog/schema/openapi-compatibility";
import { OpenApi } from "effect/http-api";
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
    "HealthzController_check:200": "The Activity process is responding",
    "ReadyzController_check:200": "PostgreSQL is available",
    "ReadyzController_check:503": "PostgreSQL is unavailable or timed out",
    "ActivitiesController_findOne:404": "Activity not found",
    "ActivitiesController_deleteActivity:404": "Activity not found",
  },
);

// OpenAPI 3.0 represents a null-only value through a nullable enum.
for (const [status, property] of [
  ["200", "error"],
  ["503", "info"],
] as const) {
  setOpenApiCompatibilityValue(
    document,
    [
      "paths",
      "/readyz",
      "get",
      "responses",
      status,
      "content",
      "application/json",
      "schema",
      "properties",
      property,
    ],
    { type: "object", nullable: true, enum: [null] },
  );
}

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

await Bun.write(
  new URL("../../openapi.yaml", import.meta.url),
  stringify(document, { lineWidth: 0 }),
);
