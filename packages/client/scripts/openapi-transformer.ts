import { isObjectRecord } from "@lootlog/schema/records";
import {
  decodeOpenApiDocument,
  isJsonObject,
  type JsonValue,
} from "./openapi-document.js";
import { sanitizeOpenApiDocument } from "@lootlog/protocol/openapi";

type MutableOpenApiDocument = {
  components?: { schemas?: Record<string, JsonValue> };
};

const replaceSchemaRef = (value: unknown, fromRef: string, toRef: string) => {
  if (Array.isArray(value)) {
    value.forEach((item) => replaceSchemaRef(item, fromRef, toRef));
    return;
  }

  if (!isObjectRecord(value)) {
    return;
  }

  const dictionary = value;

  if (dictionary.$ref === fromRef) {
    dictionary.$ref = toRef;
  }

  Object.values(dictionary).forEach((item) =>
    replaceSchemaRef(item, fromRef, toRef),
  );
};

const replaceComponentSchema = (
  document: MutableOpenApiDocument,
  fromSchemaName: string,
  toSchemaName: string,
) => {
  const schemas = document.components?.schemas;

  if (!schemas?.[fromSchemaName] || !schemas[toSchemaName]) {
    return;
  }

  replaceSchemaRef(
    document,
    `#/components/schemas/${fromSchemaName}`,
    `#/components/schemas/${toSchemaName}`,
  );
  delete schemas[fromSchemaName];
};

const aliasJsonValueSchema = (document: MutableOpenApiDocument) => {
  const schemas = document.components?.schemas;
  const generatedSchemaName = "NotificationTargetResponseDto__schema0";
  const generatedSchema = schemas?.[generatedSchemaName];

  if (!schemas || !isJsonObject(generatedSchema)) {
    return;
  }

  schemas.JsonValue ??= generatedSchema;
  replaceSchemaRef(
    document,
    `#/components/schemas/${generatedSchemaName}`,
    "#/components/schemas/JsonValue",
  );
  delete schemas[generatedSchemaName];
};

export default function transformOpenApiDocument(inputDocument: unknown) {
  const parsed = decodeOpenApiDocument(sanitizeOpenApiDocument(inputDocument));
  if (!parsed.components?.schemas) return parsed;
  const document = {
    ...parsed,
    components: {
      ...parsed.components,
      schemas: { ...parsed.components.schemas },
    },
  };

  aliasJsonValueSchema(document);
  replaceComponentSchema(
    document,
    "LootShareResponseDto_Output",
    "LootShareResponseDto",
  );

  return document;
}
