type OpenApiDictionary = Record<string, unknown>;

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

export function sanitizeOpenApiDocument<TDocument>(document: TDocument) {
  stripTypedObjectAdditionalProperties(document);
  stripUnsupportedOpenApiKeywords(document);
  ensurePathParameters(document);
  preserveLegacyQueryParameterSchemas(document);
  preserveLegacyArraySchemaKeyOrder(document);

  return document;
}

function preserveLegacyQueryParameterSchemas(document: unknown) {
  visitOpenApiDictionaries(document, (value) => {
    if (Array.isArray(value.parameters)) {
      const limitParameterIndex = value.parameters.findIndex(
        (parameter) =>
          isLegacyLimitQueryParameter(parameter) &&
          parameter.required === false,
      );

      if (
        limitParameterIndex >= 0 &&
        limitParameterIndex < value.parameters.length - 1
      ) {
        const [limitParameter] = value.parameters.splice(
          limitParameterIndex,
          1,
        );
        value.parameters.push(limitParameter);
      }
    }

    if (isLegacyLimitQueryParameter(value) && value.required === false) {
      value.schema = {};
    }
  });
}

function isLegacyLimitQueryParameter(
  value: unknown,
): value is OpenApiDictionary {
  return (
    isOpenApiDictionary(value) &&
    value.in === "query" &&
    value.name === "limit" &&
    value.description === "Result limit"
  );
}

function preserveLegacyArraySchemaKeyOrder(document: unknown) {
  visitOpenApiDictionaries(document, (value) => {
    if (
      value.type !== "array" ||
      (!("minItems" in value) && !("maxItems" in value))
    ) {
      return;
    }

    const entries = Object.entries(value);
    const arrayKeywordOrder = new Map([
      ["minItems", 0],
      ["maxItems", 1],
      ["type", 2],
    ]);

    entries.sort(([leftKey], [rightKey]) => {
      const leftOrder = arrayKeywordOrder.get(leftKey);
      const rightOrder = arrayKeywordOrder.get(rightKey);

      if (leftOrder === undefined && rightOrder === undefined) return 0;
      if (leftOrder === undefined) return 1;
      if (rightOrder === undefined) return -1;
      return leftOrder - rightOrder;
    });

    for (const key of Object.keys(value)) {
      delete value[key];
    }
    Object.assign(value, Object.fromEntries(entries));
  });
}

function visitOpenApiDictionaries(
  value: unknown,
  visitor: (value: OpenApiDictionary) => void,
) {
  if (Array.isArray(value)) {
    value.forEach((entry) => visitOpenApiDictionaries(entry, visitor));
    return;
  }

  if (!isOpenApiDictionary(value)) return;

  Object.values(value).forEach((entry) =>
    visitOpenApiDictionaries(entry, visitor),
  );
  visitor(value);
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

  if (!isOpenApiDictionary(value)) return;

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

  if (!isOpenApiDictionary(value)) return;

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
    if (!isOpenApiDictionary(pathItem)) continue;

    const pathParameterNames = Array.from(
      pathName.matchAll(/\{([^}]+)\}/g),
      (match) => match[1],
    );
    if (pathParameterNames.length === 0) continue;

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
