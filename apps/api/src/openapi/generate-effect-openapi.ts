import { rename, unlink } from "node:fs/promises";
import { OpenApi } from "effect/unstable/httpapi";
import { stringify } from "yaml";
import { LootlogApi } from "../http-api/lootlog-api.generated.js";
import { NULLABLE_JSON_SCHEMA_NAMES } from "../http-api/restore-nullable-schemas.js";

const EXPECTED_OPERATION_COUNT = 199;
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
const ENCODED_NUMBER_PATTERN = "^[+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?$";

type JsonObject = Record<string, unknown>;

const integerSchema = (minimum: number, maximum: number): JsonObject => ({
  type: "integer",
  minimum,
  maximum,
});

const queryParameterSchemas: Readonly<Record<string, JsonObject>> = {
  "TimersController_searchNpcsWithTimerData:limit": {
    type: "number",
    minimum: 1,
    maximum: 50,
    default: 10,
  },
  "LootsController_fetchLootsByGuildId:limit": integerSchema(1, 100),
  "LootsController_fetchLootsByGuildId:cursor": integerSchema(
    Number.MIN_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,
  ),
  "LootsController_fetchLootsByGuildId:npcLevelMin": integerSchema(0, 500),
  "LootsController_fetchLootsByGuildId:npcLevelMax": integerSchema(0, 500),
  "LootsController_fetchLootsByGuildId:itemLevelMin": integerSchema(0, 500),
  "LootsController_fetchLootsByGuildId:itemLevelMax": integerSchema(0, 500),
  "LootsController_fetchLootsByGuildId:playerLevelMin": integerSchema(0, 500),
  "LootsController_fetchLootsByGuildId:playerLevelMax": integerSchema(0, 500),
  "LootsController_countLootsByGuildId:limit": integerSchema(1, 100),
  "LootsController_countLootsByGuildId:cursor": integerSchema(
    Number.MIN_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,
  ),
  "LootsController_countLootsByGuildId:npcLevelMin": integerSchema(0, 500),
  "LootsController_countLootsByGuildId:npcLevelMax": integerSchema(0, 500),
  "LootsController_countLootsByGuildId:itemLevelMin": integerSchema(0, 500),
  "LootsController_countLootsByGuildId:itemLevelMax": integerSchema(0, 500),
  "LootsController_countLootsByGuildId:playerLevelMin": integerSchema(0, 500),
  "LootsController_countLootsByGuildId:playerLevelMax": integerSchema(0, 500),
  "KillsController_getGuildKillStats:minLvl": integerSchema(0, 500),
  "KillsController_getGuildKillStats:maxLvl": integerSchema(0, 500),
  "KillsController_getUserKillStats:topNpcsLimit": integerSchema(
    1,
    Number.MAX_SAFE_INTEGER,
  ),
  "KillsController_getUserNpcKills:cursor": integerSchema(
    0,
    Number.MAX_SAFE_INTEGER,
  ),
  "KillsController_getUserNpcKills:limit": integerSchema(1, 100),
  "KillsController_getUserNpcKills:minLvl": integerSchema(0, 500),
  "KillsController_getUserNpcKills:maxLvl": integerSchema(0, 500),
  "KillsController_getGuildTopNpcs:limit": { type: "number" },
  "KillsController_getGuildTopKillersByType:limit": { type: "number" },
  "KillsController_getNpcKillers:limit": integerSchema(1, 100),
  "KillsController_getMemberKills:minLvl": integerSchema(0, 500),
  "KillsController_getMemberKills:maxLvl": integerSchema(0, 500),
  "KillsController_getMemberKills:limit": integerSchema(1, 100),
  "KillsController_getMemberKills:cursor": integerSchema(
    0,
    Number.MAX_SAFE_INTEGER,
  ),
};

const isJsonObject = (value: unknown): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const replaceReferences = (
  value: unknown,
  replacements: ReadonlyMap<string, string>,
): void => {
  if (Array.isArray(value)) {
    for (const item of value) replaceReferences(item, replacements);
    return;
  }
  if (!isJsonObject(value)) return;

  if (typeof value["$ref"] === "string") {
    value["$ref"] = replacements.get(value["$ref"]) ?? value["$ref"];
  }
  for (const item of Object.values(value))
    replaceReferences(item, replacements);
};

const normalizeNullableSchemas = (value: unknown): void => {
  if (Array.isArray(value)) {
    for (const item of value) normalizeNullableSchemas(item);
    return;
  }
  if (!isJsonObject(value)) return;

  if (Array.isArray(value["examples"]) && value["example"] === undefined) {
    value["example"] = value["examples"][0];
    delete value["examples"];
  }
  if (typeof value["exclusiveMinimum"] === "number") {
    value["minimum"] = value["exclusiveMinimum"];
    value["exclusiveMinimum"] = true;
  }
  if (typeof value["exclusiveMaximum"] === "number") {
    value["maximum"] = value["exclusiveMaximum"];
    value["exclusiveMaximum"] = true;
  }
  if (value["const"] !== undefined && value["enum"] === undefined) {
    value["enum"] = [value["const"]];
    delete value["const"];
  }

  for (const unionKey of ["anyOf", "oneOf"] as const) {
    const variants = value[unionKey];
    if (!Array.isArray(variants)) continue;
    const nonNullVariants = variants.filter(
      (variant) => !isJsonObject(variant) || variant["type"] !== "null",
    );
    if (nonNullVariants.length === variants.length) continue;

    delete value[unionKey];
    value["nullable"] = true;
    if (nonNullVariants.length === 1 && isJsonObject(nonNullVariants[0])) {
      Object.assign(value, nonNullVariants[0]);
    } else {
      value[unionKey] = nonNullVariants;
    }
  }

  for (const item of Object.values(value)) normalizeNullableSchemas(item);
};

const restoreRecursiveJsonReferences = (document: {
  components: { schemas: Record<string, JsonObject> };
  paths: Record<string, unknown>;
}): void => {
  const nullableSchemaNames = new Set<string>(NULLABLE_JSON_SCHEMA_NAMES);
  const suspendedReferences = new Map<string, string>();

  for (const [name, schema] of Object.entries(document.components.schemas)) {
    const reference = schema["$ref"];
    if (
      name.startsWith("Suspend_") &&
      typeof reference === "string" &&
      nullableSchemaNames.has(reference.split("/").at(-1) ?? "")
    ) {
      suspendedReferences.set(`#/components/schemas/${name}`, reference);
    }
  }

  const resolveReference = (value: unknown): string | undefined => {
    if (!isJsonObject(value) || typeof value["$ref"] !== "string") {
      return undefined;
    }
    const reference = value["$ref"];
    const resolved = suspendedReferences.get(reference) ?? reference;
    return nullableSchemaNames.has(resolved.split("/").at(-1) ?? "")
      ? resolved
      : undefined;
  };

  const restoreValue = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) restoreValue(item);
      return;
    }
    if (!isJsonObject(value)) return;

    const variants = value["anyOf"];
    if (Array.isArray(variants) && variants.length === 5) {
      const primitiveTypes = new Set(
        variants.flatMap((variant) =>
          isJsonObject(variant) && typeof variant["type"] === "string"
            ? [variant["type"]]
            : [],
        ),
      );
      const arrayVariant = variants.find(
        (variant) => isJsonObject(variant) && variant["type"] === "array",
      );
      const objectVariant = variants.find(
        (variant) => isJsonObject(variant) && variant["type"] === "object",
      );
      const arrayReference = isJsonObject(arrayVariant)
        ? resolveReference(arrayVariant["items"])
        : undefined;
      const objectReference = isJsonObject(objectVariant)
        ? resolveReference(objectVariant["additionalProperties"])
        : undefined;

      if (
        primitiveTypes.has("string") &&
        primitiveTypes.has("number") &&
        primitiveTypes.has("boolean") &&
        arrayReference !== undefined &&
        arrayReference === objectReference
      ) {
        for (const key of Object.keys(value)) delete value[key];
        value["$ref"] = arrayReference;
        return;
      }
    }

    for (const item of Object.values(value)) restoreValue(item);
  };

  restoreValue(document.paths);
  for (const [name, schema] of Object.entries(document.components.schemas)) {
    if (!nullableSchemaNames.has(name)) restoreValue(schema);
  }

  for (const name of NULLABLE_JSON_SCHEMA_NAMES) {
    const reference = `#/components/schemas/${name}`;
    document.components.schemas[name] = {
      anyOf: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { type: "array", items: { $ref: reference } },
        { type: "object", additionalProperties: { $ref: reference } },
      ],
      nullable: true,
    };
  }
};

const target = new URL("../../openapi.yaml", import.meta.url);
const temporary = new URL("../../openapi.yaml.tmp", import.meta.url);
const document = OpenApi.fromApi(LootlogApi);

const duplicateSchemaReferences = new Map<string, string>();
for (const [name, schema] of Object.entries(document.components.schemas)) {
  const match = /^(.*)_([1-9][0-9]*)$/.exec(name);
  const baseName = match?.[1];
  if (baseName === undefined) continue;
  const baseSchema = document.components.schemas[baseName];
  if (
    baseSchema !== undefined &&
    JSON.stringify(schema) === JSON.stringify(baseSchema)
  ) {
    duplicateSchemaReferences.set(
      `#/components/schemas/${name}`,
      `#/components/schemas/${baseName}`,
    );
    delete document.components.schemas[name];
  }
}
replaceReferences(document, duplicateSchemaReferences);

for (const path of Object.values(document.paths)) {
  for (const method of HTTP_METHODS) {
    const operation = path[method];
    if (operation === undefined) continue;
    const operationId = operation.operationId;
    for (const parameter of operation.parameters ?? []) {
      if ("$ref" in parameter || parameter.schema === undefined) continue;
      const schema = parameter.schema as JsonObject;
      if (
        parameter.in === "query" &&
        schema["type"] === "string" &&
        JSON.stringify(schema["enum"]) === JSON.stringify(["true", "false"])
      ) {
        parameter.schema = { type: "boolean" };
        continue;
      }
      if (
        parameter.in === "path" &&
        schema["type"] === "string" &&
        schema["pattern"] === ENCODED_NUMBER_PATTERN
      ) {
        parameter.schema = { type: "number" };
        continue;
      }
      if (parameter.in !== "query" || operationId === undefined) continue;
      const replacement =
        queryParameterSchemas[`${operationId}:${parameter.name}`];
      if (replacement !== undefined) parameter.schema = replacement;
    }
  }
}

const compatibilitySchemas = {
  TimerNpcResponseDto: {
    $ref: "#/components/schemas/TimerResponseDto/properties/npc",
  },
  TimerActorCharacterResponseDto: {
    $ref: "#/components/schemas/TimerResponseDto/properties/actorCharacter",
  },
  TimerHistoryActorCharacterResponseDto: {
    $ref: "#/components/schemas/TimerHistoryResponseDto/properties/actorCharacter",
  },
  LootItemResponseDto: {
    $ref: "#/components/schemas/LootResponseDto/properties/items/items",
  },
  LootPlayerResponseDto: {
    $ref: "#/components/schemas/LootResponseDto/properties/players/items",
  },
  LootNpcResponseDto: {
    $ref: "#/components/schemas/LootResponseDto/properties/npcs/items",
  },
  LootSubmissionResponseDto: {
    $ref: "#/components/schemas/LootResponseDto/properties/submissions/items",
  },
  LootSubmissionMemberResponseDto: {
    $ref: "#/components/schemas/LootResponseDto/properties/submissions/items/properties/member",
  },
  LootItemResponseDto_Output: {
    $ref: "#/components/schemas/NullableLootItemResponseDto_Output",
  },
  LootShareResponseDto: {
    type: "object",
    additionalProperties: {
      type: "array",
      items: { type: "string" },
    },
  },
  NotificationAllowedMentionsResponseDto: {
    $ref: "#/components/schemas/NotificationJobsResponseDto/properties/pending/items/properties/payloadSnapshot/properties/allowedMentions",
  },
  NotificationJobPayloadSnapshotResponseDto: {
    $ref: "#/components/schemas/NotificationJobsResponseDto/properties/pending/items/properties/payloadSnapshot",
  },
} as const;

normalizeNullableSchemas(document);
(document as { openapi: string }).openapi = "3.0.0";
restoreRecursiveJsonReferences(document);
Object.assign(document.components.schemas, compatibilitySchemas);

const operationIds = Object.values(document.paths).flatMap((path) =>
  HTTP_METHODS.flatMap((method) => {
    const operation = path[method];
    return operation?.operationId === undefined ? [] : [operation.operationId];
  }),
);
const uniqueOperationIds = new Set(operationIds);

if (
  operationIds.length !== EXPECTED_OPERATION_COUNT ||
  uniqueOperationIds.size !== EXPECTED_OPERATION_COUNT
) {
  throw new Error(
    `OpenAPI generation requires ${EXPECTED_OPERATION_COUNT} unique operations; found ${operationIds.length} operations and ${uniqueOperationIds.size} unique IDs`,
  );
}

const yaml = stringify(document, {
  lineWidth: 0,
  minContentWidth: 0,
  sortMapEntries: false,
});

try {
  await Bun.write(temporary, yaml);
  await rename(temporary, target);
} catch (error) {
  await unlink(temporary).catch(() => undefined);
  throw error;
}
