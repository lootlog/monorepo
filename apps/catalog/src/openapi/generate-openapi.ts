import {
  integerSchema,
  preserveOpenApi30Contract,
} from "@lootlog/schema/openapi-compatibility";
import { OpenApi } from "effect/http-api";
import { stringify } from "yaml";
import { CatalogApi } from "#src/http-api/catalog-api";

const document = OpenApi.fromApi(CatalogApi);

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
    "CatalogController_getItems:ids": {
      schema: {
        type: "array",
        items: integerSchema(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
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
    "CatalogController_getItems:excludedStatKeys": formArray({
      type: "string",
    }),
    "CatalogController_getItems:legendaryBonuses": formArray({
      type: "string",
    }),
    "CatalogController_getItems:dropSourceTypes": formArray({ type: "string" }),
    "CatalogController_getItems:limit": numberWithDefault(24),
    "CatalogController_getItems:offset": numberWithDefault(0),
    "CatalogController_getNpcs:ids": {
      schema: {
        type: "array",
        items: integerSchema(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
      },
      style: "form",
      explode: true,
    },
    "CatalogController_getNpcs:keys": formArray({ type: "string" }),
    "CatalogController_getNpcs:types": formArray({ type: "string" }),
    "CatalogController_getNpcs:bossOrigins": formArray({ type: "string" }),
    "CatalogController_getNpcs:minLevel": { schema: { type: "number" } },
    "CatalogController_getNpcs:maxLevel": { schema: { type: "number" } },
    "CatalogController_getNpcs:limit": numberWithDefault(24),
    "CatalogController_getNpcs:offset": numberWithDefault(0),
    "CatalogReportsController_getOwn:subjectId": {
      schema: integerSchema(1, Number.MAX_SAFE_INTEGER),
    },
    "CatalogReportsController_list:limit": {
      schema: { ...integerSchema(1, 100), default: 20 },
    },
    "CatalogReportsController_list:offset": {
      schema: { ...integerSchema(0, Number.MAX_SAFE_INTEGER), default: 0 },
    },
  },
  {},
);

await Bun.write(
  new URL("../../openapi.yaml", import.meta.url),
  stringify(document, { lineWidth: 0 }),
);
