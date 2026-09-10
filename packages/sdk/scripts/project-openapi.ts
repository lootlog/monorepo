import { isString } from "effect/Predicate";
import {
  PUBLIC_API_OPERATIONS,
  type PublicApiService,
} from "@lootlog/schema/public-api-policy";

import {
  type JsonValue,
  isJsonObject as isObject,
} from "../../client/scripts/openapi-document";

type JsonObject = { [key: string]: JsonValue };

/** Project only explicitly supported operations and transitively referenced components. */
export function projectOpenApi(input: JsonObject, service: PublicApiService) {
  if (!isObject(input.paths)) throw new TypeError("Invalid OpenAPI document");
  const paths: JsonObject = {};

  for (const entry of PUBLIC_API_OPERATIONS) {
    if (entry.service !== service || entry.access === "session-only") continue;
    const item = input.paths[entry.path];

    const operation = isObject(item)
      ? item[entry.method.toLowerCase()]
      : undefined;

    if (!isObject(operation) || operation.operationId !== entry.operationId)
      throw new Error(
        `Missing public operation ${service}:${entry.operationId}`,
      );
    const existing = paths[entry.path];
    const path: JsonObject = isObject(existing) ? { ...existing } : {};
    path[entry.method.toLowerCase()] = {
      ...operation,
      security:
        (service === "main" && entry.path.startsWith("/public/")) ||
        (service === "battlelog" && entry.path.startsWith("/battles/public/"))
          ? []
          : [{ apiKey: [] }],
      "x-lootlog-access": entry.access,
      "x-lootlog-data": entry.data,
    };

    if (isObject(item) && item.parameters) path.parameters = item.parameters;
    paths[entry.path] = path;
  }

  const components: JsonObject = {};
  components.securitySchemes = {
    apiKey: { type: "apiKey", in: "header", name: "X-Api-Key" },
  };
  const seen = new Set<string>();

  const visit = (value: JsonValue): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);

      return;
    }

    if (!isObject(value)) return;

    if (
      isString(value.$ref) &&
      value.$ref.startsWith("#/components/") &&
      !seen.has(value.$ref)
    ) {
      seen.add(value.$ref);
      const [, , group, name] = value.$ref.split("/");

      if (!group || !name || !isObject(input.components))
        throw new Error(`Invalid reference ${value.$ref}`);
      const collection = input.components[group];

      if (!isObject(collection) || collection[name] === undefined)
        throw new Error(`Unresolved reference ${value.$ref}`);
      const current = components[group];
      const output: JsonObject = isObject(current) ? { ...current } : {};
      const referenced = collection[name];

      if (referenced === undefined)
        throw new Error(`Unresolved reference ${value.$ref}`);
      output[name] = referenced;
      components[group] = output;
      visit(referenced);
    }

    Object.values(value).forEach(visit);
  };

  visit(paths);

  return {
    openapi: input.openapi,
    info: input.info,
    servers: [
      { url: `https://${service === "main" ? "api" : service}.lootlog.pl` },
    ],
    paths,
    components,
  };
}
