type OpenApiDictionary = Record<string, unknown>;

export type OpenApiYamlDumpOptions = {
  noRefs: true;
  lineWidth: -1;
  quotingType: '"';
};

const httpMethods = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
  "trace",
]);

export const openApiYamlDumpOptions = {
  noRefs: true,
  lineWidth: -1,
  quotingType: '"',
} satisfies OpenApiYamlDumpOptions;

export function sanitizeOpenApiDocument<TDocument>(document: TDocument) {
  stripTypedObjectAdditionalProperties(document);
  stripUnsupportedOpenApiKeywords(document);
  ensurePathParameters(document);

  return document;
}

function isOpenApiDictionary(value: unknown): value is OpenApiDictionary {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOpenApiProperty(value: OpenApiDictionary, propertyName: string) {
  return Object.prototype.hasOwnProperty.call(value, propertyName);
}

function stripTypedObjectAdditionalProperties(value: unknown) {
  if (Array.isArray(value)) {
    value.forEach(stripTypedObjectAdditionalProperties);
    return;
  }

  if (!isOpenApiDictionary(value)) {
    return;
  }

  if (
    hasOpenApiProperty(value, "properties") &&
    hasOpenApiProperty(value, "additionalProperties")
  ) {
    delete value.additionalProperties;
  }

  Object.values(value).forEach(stripTypedObjectAdditionalProperties);
}

function stripUnsupportedOpenApiKeywords(value: unknown) {
  if (Array.isArray(value)) {
    value.forEach(stripUnsupportedOpenApiKeywords);
    return;
  }

  if (!isOpenApiDictionary(value)) {
    return;
  }

  if (hasOpenApiProperty(value, "propertyNames")) {
    delete value.propertyNames;
  }

  if (hasOpenApiProperty(value, "const")) {
    value.enum = [value.const];
    delete value.const;
  }

  Object.values(value).forEach(stripUnsupportedOpenApiKeywords);
}

function ensurePathParameters(document: unknown) {
  if (!isOpenApiDictionary(document) || !isOpenApiDictionary(document.paths)) {
    return;
  }

  for (const [pathName, pathItem] of Object.entries(document.paths)) {
    if (!isOpenApiDictionary(pathItem)) {
      continue;
    }

    const pathParameterNames = Array.from(
      pathName.matchAll(/\{([^}]+)\}/g),
      (match) => match[1],
    );

    if (pathParameterNames.length === 0) {
      continue;
    }

    for (const [methodName, operation] of Object.entries(pathItem)) {
      if (!httpMethods.has(methodName) || !isOpenApiDictionary(operation)) {
        continue;
      }

      const pathLevelParameters = Array.isArray(pathItem.parameters)
        ? pathItem.parameters
        : [];
      const parameters = Array.isArray(operation.parameters)
        ? operation.parameters
        : [];

      for (const parameterName of pathParameterNames) {
        const existingParameter = [...pathLevelParameters, ...parameters].find(
          (parameter): parameter is OpenApiDictionary =>
            isOpenApiDictionary(parameter) &&
            parameter.in === "path" &&
            parameter.name === parameterName,
        );

        if (!existingParameter) {
          parameters.push({
            name: parameterName,
            in: "path",
            required: true,
            schema: { type: "string" },
          });
          continue;
        }

        if (
          !isOpenApiDictionary(existingParameter.schema) ||
          Object.keys(existingParameter.schema).length === 0
        ) {
          existingParameter.schema = { type: "string" };
        }
      }

      operation.parameters = parameters;
    }
  }
}
