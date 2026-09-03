import { preserveOpenApi30Contract } from "@lootlog/schema/openapi-compatibility";
import { OpenApi } from "effect/unstable/httpapi";
import { stringify } from "yaml";
import { SearchApi } from "#src/http-api/search-api";

const document = OpenApi.fromApi(SearchApi);
const numberWithDefault = (defaultValue: number) => ({
  schema: { type: "number", default: defaultValue },
});
const formArray = (items: Record<string, unknown>) => ({
  schema: { type: "array", items },
  style: "form",
  explode: true,
});
preserveOpenApi30Contract(
  document,
  {
    "PlayersController_getPlayers:limit": numberWithDefault(10),
    "NpcsController_getNpcs:ids": {
      schema: {
        type: "array",
        items: {
          type: "integer",
          minimum: Number.MIN_SAFE_INTEGER,
          maximum: Number.MAX_SAFE_INTEGER,
        },
      },
    },
    "NpcsController_getNpcs:limit": numberWithDefault(10),
    "ItemsController_getItems:limit": numberWithDefault(20),
    "ItemsController_getItems:offset": numberWithDefault(0),
    "ItemsController_getItems:filter": {
      schema: {
        anyOf: [
          { type: "string" },
          { type: "array", items: { type: "string" } },
        ],
      },
      style: "form",
      explode: true,
    },
    "ItemsController_getItems:facets": formArray({ type: "string" }),
    "ItemsController_getItems:sort": formArray({ type: "string" }),
    "AllController_searchAll:limit": numberWithDefault(10),
  },
  {
    "HealthzController_healthCheck:200": "Search service is healthy",
    "PlayersController_getPlayers:200": "List of matching players",
    "NpcsController_getNpcs:200": "List of matching NPCs",
    "ItemsController_getItems:200": "Item search results",
    "AllController_searchAll:200":
      "Aggregated search results across items, players, and NPCs",
  },
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
const operationIds = Object.values(document.paths).flatMap((path) =>
  HTTP_METHODS.flatMap((method) => {
    const operation = path[method];
    return operation?.operationId === undefined ? [] : [operation.operationId];
  }),
);
if (operationIds.length !== 5 || new Set(operationIds).size !== 5) {
  throw new Error("Search OpenAPI requires 5 unique operations");
}
await Bun.write(
  new URL("../../openapi.yaml", import.meta.url),
  stringify(document, { lineWidth: 0 }),
);
