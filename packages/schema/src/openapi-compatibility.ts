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

type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeSchemaAnnotations = (value: JsonObject): void => {
  if (Array.isArray(value.examples) && value.example === undefined) {
    value.example = value.examples[0];
    delete value.examples;
  }
  if (typeof value.exclusiveMinimum === "number") {
    value.minimum = value.exclusiveMinimum;
    value.exclusiveMinimum = true;
  }
  if (typeof value.exclusiveMaximum === "number") {
    value.maximum = value.exclusiveMaximum;
    value.exclusiveMaximum = true;
  }
  if (value.const !== undefined && value.enum === undefined) {
    value.enum = [value.const];
    delete value.const;
  }
  if (value.additionalProperties === false) delete value.additionalProperties;
};

const normalizeNullableSchema = (value: JsonObject): void => {
  for (const unionKey of ["anyOf", "oneOf"] as const) {
    const variants = value[unionKey];
    if (!Array.isArray(variants)) continue;
    const nonNullVariants = variants.filter(
      (variant) => !isJsonObject(variant) || variant.type !== "null",
    );
    if (nonNullVariants.length === variants.length) continue;

    delete value[unionKey];
    value.nullable = true;
    if (nonNullVariants.length === 1 && isJsonObject(nonNullVariants[0])) {
      Object.assign(value, nonNullVariants[0]);
    } else {
      value[unionKey] = nonNullVariants;
    }
  }
};

const removeEmptyUnknownIntersection = (value: JsonObject): void => {
  if (
    Array.isArray(value.allOf) &&
    value.allOf.length === 1 &&
    isJsonObject(value.allOf[0]) &&
    value.allOf[0].type === "object" &&
    isJsonObject(value.allOf[0].additionalProperties) &&
    Object.keys(value.allOf[0].additionalProperties).length === 0
  ) {
    delete value.allOf;
  }
};

const normalizeSchema = (value: unknown): void => {
  if (Array.isArray(value)) {
    for (const item of value) normalizeSchema(item);
    return;
  }
  if (!isJsonObject(value)) return;

  normalizeSchemaAnnotations(value);
  normalizeNullableSchema(value);
  removeEmptyUnknownIntersection(value);
  for (const item of Object.values(value)) normalizeSchema(item);
};

export const setOpenApiCompatibilityValue = (
  input: unknown,
  path: ReadonlyArray<string>,
  value: unknown,
): void => {
  if (!isJsonObject(input) || path.length === 0) {
    throw new Error("OpenAPI compatibility path must resolve inside an object");
  }
  let current = input;
  for (const segment of path.slice(0, -1)) {
    const next = current[segment];
    if (!isJsonObject(next)) {
      throw new Error(
        `OpenAPI compatibility path does not exist: ${path.join(".")}`,
      );
    }
    current = next;
  }
  const key = path.at(-1);
  if (key === undefined) throw new Error("OpenAPI compatibility path is empty");
  current[key] = value;
};

const normalizeDocumentMetadata = (document: JsonObject): void => {
  document.openapi = "3.0.0";
  document.security = undefined;
  document.tags = [];
  if (isJsonObject(document.info)) document.info.contact = {};

  const components = document.components;
  if (!isJsonObject(components)) return;
  const securitySchemes = components.securitySchemes;
  if (
    isJsonObject(securitySchemes) &&
    Object.keys(securitySchemes).length === 0
  ) {
    delete components.securitySchemes;
    return;
  }
  if (!isJsonObject(securitySchemes)) return;
  for (const securityScheme of Object.values(securitySchemes)) {
    if (isJsonObject(securityScheme) && securityScheme.scheme === "Bearer") {
      securityScheme.scheme = "bearer";
    }
  }
};

const normalizeOperation = (
  operation: JsonObject,
  parameterSchemas: Readonly<Record<string, JsonObject>>,
  responseDescriptions?: Readonly<Record<string, string>>,
): void => {
  if (Array.isArray(operation.security) && operation.security.length === 0) {
    delete operation.security;
  }
  if (typeof operation.operationId !== "string") return;
  if (responseDescriptions !== undefined && isJsonObject(operation.responses)) {
    for (const [status, response] of Object.entries(operation.responses)) {
      if (!isJsonObject(response)) continue;
      response.description =
        responseDescriptions[`${operation.operationId}:${status}`] ?? "";
    }
  }
  if (!Array.isArray(operation.parameters)) return;
  for (const parameter of operation.parameters) {
    if (!isJsonObject(parameter) || typeof parameter.name !== "string")
      continue;
    const replacement =
      parameterSchemas[`${operation.operationId}:${parameter.name}`];
    if (replacement !== undefined) Object.assign(parameter, replacement);
  }
};

export const preserveOpenApi30Contract = (
  input: unknown,
  parameterSchemas: Readonly<Record<string, JsonObject>> = {},
  responseDescriptions?: Readonly<Record<string, string>>,
): void => {
  if (!isJsonObject(input)) {
    throw new Error("OpenAPI document must be an object");
  }
  normalizeSchema(input);
  normalizeDocumentMetadata(input);

  if (!isJsonObject(input.paths)) return;
  for (const path of Object.values(input.paths)) {
    if (!isJsonObject(path)) continue;
    for (const method of HTTP_METHODS) {
      const operation = path[method];
      if (isJsonObject(operation)) {
        normalizeOperation(operation, parameterSchemas, responseDescriptions);
      }
    }
  }
};
