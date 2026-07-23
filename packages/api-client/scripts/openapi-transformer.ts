import { sanitizeOpenApiDocument } from "@lootlog/nest-shared/openapi";

type OpenApiSchema = Record<string, unknown>;
type OpenApiParameter = {
  in?: string;
  name?: string;
  required?: boolean;
};
type OpenApiDocument = {
  components?: {
    schemas?: Record<string, OpenApiSchema>;
  };
  paths?: Record<
    string,
    Record<
      string,
      {
        parameters?: OpenApiParameter[];
      }
    >
  >;
};

const replaceSchemaRef = (value: unknown, fromRef: string, toRef: string) => {
  if (Array.isArray(value)) {
    value.forEach((item) => replaceSchemaRef(item, fromRef, toRef));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const dictionary = value as Record<string, unknown>;

  if (dictionary.$ref === fromRef) {
    dictionary.$ref = toRef;
  }

  Object.values(dictionary).forEach((item) =>
    replaceSchemaRef(item, fromRef, toRef),
  );
};

const replaceComponentSchema = (
  document: OpenApiDocument,
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

const aliasJsonValueSchema = (document: OpenApiDocument) => {
  const schemas = document.components?.schemas;
  const generatedSchemaName = "NotificationTargetResponseDto__schema0";
  const generatedSchema = schemas?.[generatedSchemaName];

  if (!schemas || !generatedSchema || typeof generatedSchema !== "object") {
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

const setOperationParameterRequired = (
  document: OpenApiDocument,
  path: string,
  method: string,
  parameterName: string,
  required: boolean,
) => {
  const parameters = document.paths?.[path]?.[method]?.parameters;

  if (!parameters) {
    return;
  }

  for (const parameter of parameters) {
    if (parameter.in === "query" && parameter.name === parameterName) {
      parameter.required = required;
    }
  }
};

export default function transformOpenApiDocument<TDocument>(
  inputDocument: TDocument,
) {
  const document = sanitizeOpenApiDocument(inputDocument) as TDocument &
    OpenApiDocument;

  aliasJsonValueSchema(document);
  replaceComponentSchema(
    document,
    "LootShareResponseDto_Output",
    "LootShareResponseDto",
  );

  for (const path of [
    "/guilds/{guildId}/loots",
    "/guilds/{guildId}/loots/count",
  ]) {
    for (const parameterName of [
      "cursor",
      "npcLevelMin",
      "npcLevelMax",
      "itemLevelMin",
      "itemLevelMax",
      "playerLevelMin",
      "playerLevelMax",
    ]) {
      setOperationParameterRequired(
        document,
        path,
        "get",
        parameterName,
        false,
      );
    }
  }

  return document;
}
