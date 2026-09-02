import { parse } from "yaml";

const path = new URL("../../openapi.yaml", import.meta.url);
const source = await Bun.file(path).text();
const document = parse(source) as {
  paths?: Record<string, Record<string, { operationId?: string }>>;
};
const operationIds = Object.values(document.paths ?? {}).flatMap((pathItem) =>
  Object.values(pathItem)
    .map((operation) => operation.operationId)
    .filter((value): value is string => value !== undefined),
);
const expected = [
  "HealthzController_healthCheck",
  "PlayersController_getPlayers",
  "NpcsController_getNpcs",
  "ItemsController_getItems",
  "AllController_searchAll",
];
if (JSON.stringify(operationIds.sort()) !== JSON.stringify(expected.sort()))
  throw new Error("Search OpenAPI operation IDs changed");
await Bun.write(path, source);
