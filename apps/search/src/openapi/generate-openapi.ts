import { preserveOpenApi30Contract } from "@lootlog/schema/openapi-compatibility";
import { OpenApi } from "effect/http-api";
import { stringify } from "yaml";
import { SearchApi } from "#src/http-api/search-api";

const document = OpenApi.fromApi(SearchApi);

const numberWithDefault = (defaultValue: number) => ({
  schema: { type: "number", default: defaultValue },
});

const formArray = (items: { type: "string" }) => ({
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
    "CatalogController_getItems:ids": {
      schema: {
        type: "array",
        items: {
          type: "integer",
          minimum: Number.MIN_SAFE_INTEGER,
          maximum: Number.MAX_SAFE_INTEGER,
        },
      },
      style: "form",
      explode: true,
    },
    "CatalogController_getItems:rarities": formArray({ type: "string" }),
    "CatalogController_getItems:types": formArray({ type: "string" }),
    "CatalogController_getItems:professions": formArray({ type: "string" }),
    "CatalogController_getItems:minLevel": { schema: { type: "number" } },
    "CatalogController_getItems:maxLevel": { schema: { type: "number" } },
    "CatalogController_getItems:statKeys": formArray({ type: "string" }),
    "CatalogController_getItems:legendaryBonuses": formArray({
      type: "string",
    }),
    "CatalogController_getItems:dropSourceTypes": formArray({ type: "string" }),
    "CatalogController_getItems:limit": numberWithDefault(24),
    "CatalogController_getItems:offset": numberWithDefault(0),
    "CatalogController_getNpcs:ids": {
      schema: {
        type: "array",
        items: {
          type: "integer",
          minimum: Number.MIN_SAFE_INTEGER,
          maximum: Number.MAX_SAFE_INTEGER,
        },
      },
      style: "form",
      explode: true,
    },
    "CatalogController_getNpcs:keys": formArray({ type: "string" }),
    "CatalogController_getNpcs:types": formArray({ type: "string" }),
    "CatalogController_getNpcs:limit": numberWithDefault(24),
    "CatalogController_getNpcs:offset": numberWithDefault(0),
    "AllController_searchAll:world": {
      schema: { type: "string" },
      description:
        "Filters players by world. NPC and item results cover every world of their edition.",
    },
  },
  {
    "HealthzController_healthCheck:200": "Search service is healthy",
    "PlayersController_getPlayers:200": "List of matching players",
    "NpcsController_getNpcs:200": "List of matching NPCs",
    "ItemsController_getItems:200": "Item search results",
    "CatalogController_getItems:200": "Public catalog items",
    "CatalogController_getNpcs:200": "Public catalog NPCs",
    "AllController_searchAll:200":
      "Aggregated search results across items, players, and NPCs",
  },
);

await Bun.write(
  new URL("../../openapi.yaml", import.meta.url),
  stringify(document, { lineWidth: 0 }),
);
