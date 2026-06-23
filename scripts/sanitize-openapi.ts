import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  openApiYamlDumpOptions,
  type OpenApiYamlDumpOptions,
  sanitizeOpenApiDocument,
} from "../packages/nest-shared/src/openapi/openapi-document";

type YamlModule = {
  load: (content: string) => unknown;
  dump: (document: unknown, options: OpenApiYamlDumpOptions) => string;
};

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

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const yaml = requireFromApi("js-yaml") as YamlModule;

const openApiPath = path.resolve("apps/api/openapi.yaml");
const openApiDocument = yaml.load(fs.readFileSync(openApiPath, "utf8"));

sanitizeOpenApiDocument(openApiDocument);

const document = openApiDocument as OpenApiDocument;

function replaceSchemaRef(value: unknown, fromRef: string, toRef: string) {
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
}

function replaceComponentSchema(
  openApiDocument: OpenApiDocument,
  fromSchemaName: string,
  toSchemaName: string,
) {
  const schemas = openApiDocument.components?.schemas;

  if (!schemas?.[fromSchemaName] || !schemas[toSchemaName]) {
    return;
  }

  replaceSchemaRef(
    openApiDocument,
    `#/components/schemas/${fromSchemaName}`,
    `#/components/schemas/${toSchemaName}`,
  );

  delete schemas[fromSchemaName];
}

function aliasJsonValueSchema(openApiDocument: OpenApiDocument) {
  const schemas = openApiDocument.components?.schemas;

  if (!schemas) {
    return;
  }

  const generatedSchemaName = "NotificationTargetResponseDto__schema0";
  const generatedSchema = schemas[generatedSchemaName];

  if (!generatedSchema || typeof generatedSchema !== "object") {
    return;
  }

  if (!schemas.JsonValue) {
    schemas.JsonValue = generatedSchema;
  }

  replaceSchemaRef(
    openApiDocument,
    `#/components/schemas/${generatedSchemaName}`,
    "#/components/schemas/JsonValue",
  );

  delete schemas[generatedSchemaName];
}

function setOperationParameterRequired(
  openApiDocument: OpenApiDocument,
  pathKey: string,
  method: string,
  parameterName: string,
  required: boolean,
) {
  const parameters = openApiDocument.paths?.[pathKey]?.[method]?.parameters;

  if (!parameters) {
    return;
  }

  for (const parameter of parameters) {
    if (parameter?.in !== "query" || parameter.name !== parameterName) {
      continue;
    }

    parameter.required = required;
  }
}

aliasJsonValueSchema(document);
replaceComponentSchema(
  document,
  "LootShareResponseDto_Output",
  "LootShareResponseDto",
);

for (const pathKey of [
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
      pathKey,
      "get",
      parameterName,
      false,
    );
  }
}

fs.writeFileSync(
  openApiPath,
  yaml.dump(openApiDocument, openApiYamlDumpOptions),
  "utf8",
);
