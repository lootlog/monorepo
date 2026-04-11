import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const yaml = require("../apps/api/node_modules/js-yaml");

const openApiPath = path.resolve("apps/api/openapi.yaml");
const openApiDocument = yaml.load(fs.readFileSync(openApiPath, "utf8"));
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

const stripTypedObjectAdditionalProperties = (value) => {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(stripTypedObjectAdditionalProperties);
    return;
  }

  if (
    Object.hasOwn(value, "properties") &&
    Object.hasOwn(value, "additionalProperties")
  ) {
    delete value.additionalProperties;
  }

  Object.values(value).forEach(stripTypedObjectAdditionalProperties);
};

const stripUnsupportedOpenApiKeywords = (value) => {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(stripUnsupportedOpenApiKeywords);
    return;
  }

  if (Object.hasOwn(value, "propertyNames")) {
    delete value.propertyNames;
  }

  if (Object.hasOwn(value, "const")) {
    value.enum = [value.const];
    delete value.const;
  }

  Object.values(value).forEach(stripUnsupportedOpenApiKeywords);
};

const ensurePathParameters = (document) => {
  if (!document?.paths || typeof document.paths !== "object") {
    return;
  }

  for (const [pathName, pathItem] of Object.entries(document.paths)) {
    if (!pathItem || typeof pathItem !== "object") {
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
      if (
        !httpMethods.has(methodName) ||
        !operation ||
        typeof operation !== "object"
      ) {
        continue;
      }

      const parameters = Array.isArray(operation.parameters)
        ? operation.parameters
        : [];

      for (const parameterName of pathParameterNames) {
        const existingParameter = parameters.find(
          (parameter) =>
            parameter &&
            typeof parameter === "object" &&
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
          !existingParameter.schema ||
          typeof existingParameter.schema !== "object" ||
          Object.keys(existingParameter.schema).length === 0
        ) {
          existingParameter.schema = { type: "string" };
        }
      }

      operation.parameters = parameters;
    }
  }
};

stripTypedObjectAdditionalProperties(openApiDocument);
stripUnsupportedOpenApiKeywords(openApiDocument);
ensurePathParameters(openApiDocument);

fs.writeFileSync(
  openApiPath,
  yaml.dump(openApiDocument, { noRefs: true, lineWidth: -1 }),
);
