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
  "HealthzController_check",
  "ActivitiesController_findByGuild",
  "ActivitiesController_suggestActorNames",
  "ActivitiesController_suggestWorlds",
  "ActivitiesController_suggestClanNames",
  "ActivitiesController_findByUser",
  "ActivitiesController_getMemberActivityStats",
  "ActivitiesController_findOne",
  "ActivitiesController_deleteActivity",
];
if (JSON.stringify(operationIds.sort()) !== JSON.stringify(expected.sort()))
  throw new Error("Activity OpenAPI operation IDs changed");
await Bun.write(path, source);
