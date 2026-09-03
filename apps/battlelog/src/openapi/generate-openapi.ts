import {
  preserveOpenApi30Contract,
  setOpenApiCompatibilityValue,
} from "@lootlog/schema/openapi-compatibility";
import { OpenApi } from "effect/unstable/httpapi";
import { stringify } from "yaml";
import { BattlelogApi } from "../http-api/battlelog-api.js";

const document = OpenApi.fromApi(BattlelogApi);
const integer = (maximum = Number.MAX_SAFE_INTEGER) => ({
  schema: { type: "integer", minimum: 1, maximum },
});
const boolean = { schema: { type: "boolean" } };
const parameterSchemas: Record<string, Record<string, unknown>> = {
  "BattlesController_getDashboardBattles:size": {
    schema: { type: "number", minimum: 1, maximum: 100, default: 20 },
  },
  "BattlesController_getDashboardBattles:minLevel": {
    schema: { type: "number", minimum: 1, maximum: 1000 },
  },
  "BattlesController_getDashboardBattles:maxLevel": {
    schema: { type: "number", minimum: 1, maximum: 1000 },
  },
  "BattlesController_getDashboardBattles:includeTotal": boolean,
  "BattlesController_getDashboardBattles:public": boolean,
  "BattlesController_getDashboardBattles:ph": boolean,
  "BattlesController_getDashboardBattles:matchmaking": boolean,
  "BattlesController_getBattleAnalytics:minLevel": integer(),
  "BattlesController_getBattleAnalytics:maxLevel": integer(),
  "BattlesController_getBattleAnalytics:ph": boolean,
  "BattlesController_getBattleAnalytics:matchmaking": boolean,
};
const statisticOperations = [
  "BattlesController_getCombatProfile",
  "BattlesController_getProfessionWinRate",
  "BattlesController_getHeadToHead",
  "BattlesController_getCurrentStreak",
  "BattlesController_getBattleDuration",
  "BattlesController_getPhGrowth",
  "BattlesController_getRatingGrowth",
  "BattlesController_getRatingDeltaByOpponent",
  "BattlesController_getPlayerVsPlayerBattles",
] as const;
for (const operationId of statisticOperations) {
  for (const name of ["minLevel", "maxLevel", "size", "minBattles"] as const) {
    parameterSchemas[`${operationId}:${name}`] = integer();
  }
  for (const name of ["includeTotal", "ph", "matchmaking"] as const) {
    parameterSchemas[`${operationId}:${name}`] = boolean;
  }
}
const responseDescriptions: Record<string, string> = {
  "HealthzController_healthCheck:200": "API is healthy",
};
for (const operationId of [
  "BattlesController_getBattleTimeline",
  "BattlesController_getBattle",
  "BattlesController_updateBattle",
  "BattlesController_deleteBattle",
  "BattlesController_getBattleRawData",
] as const) {
  responseDescriptions[`${operationId}:404`] = "Battle not found";
}
for (const operationId of [
  "PublicBattlesController_getPublicBattle",
  "PublicBattlesController_getPublicBattleRaw",
  "PublicBattlesController_getPublicBattleTimeline",
] as const) {
  responseDescriptions[`${operationId}:404`] = "Public battle not found";
}
preserveOpenApi30Contract(document, parameterSchemas, responseDescriptions);
setOpenApiCompatibilityValue(
  document,
  [
    "components",
    "schemas",
    "BattleRawResponseDto_Output",
    "properties",
    "rawData",
    "properties",
    "sourceEvents",
    "items",
  ],
  {},
);
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

// Effect stores endpoint definitions in hash-based collections. Normalize every
// path item before serialization so operations sharing a path cannot swap order
// between processes and make the generated client appear stale.
for (const [path, pathItem] of Object.entries(document.paths)) {
  document.paths[path] = Object.fromEntries(
    Object.entries(pathItem).sort(([left], [right]) => {
      const leftIndex = HTTP_METHODS.indexOf(
        left as (typeof HTTP_METHODS)[number],
      );
      const rightIndex = HTTP_METHODS.indexOf(
        right as (typeof HTTP_METHODS)[number],
      );

      if (leftIndex === -1 || rightIndex === -1) {
        return left.localeCompare(right);
      }

      return leftIndex - rightIndex;
    }),
  );
}
const operationIds = Object.values(document.paths).flatMap((path) =>
  HTTP_METHODS.flatMap((method) => {
    const operation = path[method];
    return operation?.operationId === undefined ? [] : [operation.operationId];
  }),
);
if (operationIds.length !== 26 || new Set(operationIds).size !== 26) {
  throw new Error("Battlelog OpenAPI requires 26 unique operations");
}
await Bun.write(
  new URL("../../openapi.yaml", import.meta.url),
  stringify(document, { lineWidth: 0 }),
);
