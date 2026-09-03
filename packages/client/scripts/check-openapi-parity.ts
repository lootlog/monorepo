import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const BASELINE_SHA = "633f8f0157cca04ef2b609ba0e2f1903b1c28949";
const HTTP_METHODS = new Set([
  "delete",
  "get",
  "head",
  "options",
  "patch",
  "post",
  "put",
  "trace",
]);
const REALTIME_TICKET_OPERATION = "POST /auth/realtime-ticket";
const GUILD_METADATA_FORBIDDEN_OPERATIONS = new Set([
  "GET /guilds/{guildId}",
  "GET /guilds/{guildId}/permissions",
]);
const TICKET_VERIFY_HEADERS = new Set([
  "x-lootlog-credential-purpose",
  "x-lootlog-websocket-origin",
]);

type JsonValue =
  | boolean
  | number
  | string
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type OpenApiDocument = {
  paths?: Record<string, Record<string, JsonValue>>;
};

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const services = [
  { baseline: "activity", current: "activity" },
  { baseline: "api", current: "api" },
  { baseline: "auth", current: "auth" },
  { baseline: "battlelog-service", current: "battlelog" },
  { baseline: "search", current: "search" },
] as const;

const readBaseline = (service: string): OpenApiDocument => {
  const result = spawnSync(
    "git",
    ["show", `${BASELINE_SHA}:apps/${service}/openapi.yaml`],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `Unable to read baseline OpenAPI for ${service}: ${result.stderr.trim()}`,
    );
  }
  return parse(result.stdout) as OpenApiDocument;
};

const readCurrent = (service: string): OpenApiDocument =>
  parse(
    readFileSync(
      resolve(repositoryRoot, `apps/${service}/openapi.yaml`),
      "utf8",
    ),
  ) as OpenApiDocument;

const operations = (document: OpenApiDocument): Map<string, JsonValue> => {
  const result = new Map<string, JsonValue>();
  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (HTTP_METHODS.has(method)) {
        result.set(`${method.toUpperCase()} ${path}`, operation);
      }
    }
  }
  return result;
};

const removePresencePermission = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== "LOOTLOG_PRESENCE_LOCATION_READ")
      .map(removePresencePermission);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        removePresencePermission(item),
      ]),
    );
  }
  return value;
};

const removeTicketVerifyHeaders = (value: JsonValue): JsonValue => {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    return value;
  }
  const operation = structuredClone(value);
  const parameters = operation["parameters"];
  if (Array.isArray(parameters)) {
    operation["parameters"] = parameters.filter((parameter) => {
      if (
        parameter === null ||
        Array.isArray(parameter) ||
        typeof parameter !== "object"
      ) {
        return true;
      }
      const name = parameter["name"];
      return typeof name !== "string" || !TICKET_VERIFY_HEADERS.has(name);
    });
  }
  return operation;
};

const removeResponseStatus = (value: JsonValue, status: string): JsonValue => {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    return value;
  }
  const operation = structuredClone(value);
  const responses = operation["responses"];
  if (
    responses !== null &&
    !Array.isArray(responses) &&
    typeof responses === "object"
  ) {
    delete responses[status];
  }
  return operation;
};

const normalizeOpenApiRepresentation = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    const normalized = value.map(normalizeOpenApiRepresentation);
    if (
      normalized.every(
        (item) =>
          item !== null &&
          !Array.isArray(item) &&
          typeof item === "object" &&
          typeof item["name"] === "string" &&
          typeof item["in"] === "string",
      )
    ) {
      return normalized.sort((left, right) => {
        const leftKey = `${(left as { in: string }).in}:${(left as { name: string }).name}`;
        const rightKey = `${(right as { in: string }).in}:${(right as { name: string }).name}`;
        return leftKey.localeCompare(rightKey);
      });
    }
    return normalized;
  }
  if (value === null || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          key !== "description" && key !== "example" && key !== "examples",
      )
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, normalizeOpenApiRepresentation(item)]),
  );
};

const normalizeAllowedChanges = (
  service: string,
  operationKey: string,
  operation: JsonValue,
): JsonValue => {
  let normalized = operation;
  if (service === "api") normalized = removePresencePermission(normalized);
  if (
    service === "api" &&
    GUILD_METADATA_FORBIDDEN_OPERATIONS.has(operationKey)
  ) {
    normalized = removeResponseStatus(normalized, "403");
  }
  if (service === "auth" && operationKey === "GET /auth/verify") {
    normalized = removeTicketVerifyHeaders(normalized);
  }

  if (
    normalized !== null &&
    !Array.isArray(normalized) &&
    typeof normalized === "object" &&
    Array.isArray(normalized["security"]) &&
    normalized["security"].length === 0
  ) {
    const { security: _security, ...withoutEmptySecurity } = normalized;
    normalized = withoutEmptySecurity;
  }

  return normalizeOpenApiRepresentation(normalized);
};

const differencePaths = (
  left: JsonValue | undefined,
  right: JsonValue | undefined,
  path = "$",
): string[] => {
  if (JSON.stringify(left) === JSON.stringify(right)) return [];
  if (
    left === undefined ||
    right === undefined ||
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object" ||
    Array.isArray(left) !== Array.isArray(right)
  ) {
    return [`${path}: ${JSON.stringify(left)} -> ${JSON.stringify(right)}`];
  }

  const leftEntries = Array.isArray(left)
    ? left.entries()
    : Object.entries(left);
  const rightKeys = new Set(
    Array.isArray(right) ? [...right.keys()].map(String) : Object.keys(right),
  );
  const differences: string[] = [];
  for (const [key, leftValue] of leftEntries) {
    const stringKey = String(key);
    rightKeys.delete(stringKey);
    const rightValue = Array.isArray(right)
      ? right[Number(key)]
      : right[stringKey];
    differences.push(
      ...differencePaths(leftValue, rightValue, `${path}.${stringKey}`),
    );
  }
  differences.push(
    ...[...rightKeys].map(
      (key) =>
        `${path}.${key}: undefined -> ${JSON.stringify(
          Array.isArray(right) ? right[Number(key)] : right[key],
        )}`,
    ),
  );
  return differences;
};

const assertTicketOperation = (operation: JsonValue | undefined): void => {
  if (
    operation === undefined ||
    operation === null ||
    Array.isArray(operation) ||
    typeof operation !== "object"
  ) {
    throw new Error(`Missing ${REALTIME_TICKET_OPERATION}`);
  }
  if (operation["operationId"] !== "AuthController_issueRealtimeTicket") {
    throw new Error("Realtime ticket operationId changed");
  }
  const responses = operation["responses"];
  if (
    responses === null ||
    Array.isArray(responses) ||
    typeof responses !== "object" ||
    responses["201"] === undefined
  ) {
    throw new Error("Realtime ticket endpoint must retain its 201 response");
  }
};

const changedOperations: string[] = [];
for (const service of services) {
  const baseline = operations(readBaseline(service.baseline));
  const current = operations(readCurrent(service.current));

  const additions = [...current.keys()].filter((key) => !baseline.has(key));
  const removals = [...baseline.keys()].filter((key) => !current.has(key));
  const expectedAdditions = service.current === "auth" ? 1 : 0;
  if (
    additions.length !== expectedAdditions ||
    (expectedAdditions === 1 && additions[0] !== REALTIME_TICKET_OPERATION)
  ) {
    throw new Error(
      `${service.current} has unexpected OpenAPI additions: ${additions.join(", ") || "none"}`,
    );
  }
  if (removals.length > 0) {
    throw new Error(
      `${service.current} removed OpenAPI operations: ${removals.join(", ")}`,
    );
  }

  for (const [key, baselineOperation] of baseline) {
    const currentOperation = current.get(key);
    if (currentOperation === undefined) continue;
    const normalized = normalizeAllowedChanges(
      service.current,
      key,
      currentOperation,
    );
    const normalizedBaseline =
      normalizeOpenApiRepresentation(baselineOperation);
    if (JSON.stringify(normalized) !== JSON.stringify(normalizedBaseline)) {
      const paths = differencePaths(normalizedBaseline, normalized).slice(0, 4);
      changedOperations.push(
        `${service.current}: ${key} (${paths.join(", ")})`,
      );
    }
  }

  if (service.current === "auth") {
    assertTicketOperation(current.get(REALTIME_TICKET_OPERATION));
  }
}

if (changedOperations.length > 0) {
  throw new Error(
    `OpenAPI operations changed:\n${changedOperations.join("\n")}`,
  );
}

process.stdout.write(
  "OpenAPI parity passed: 243 baseline operations plus the allowlisted realtime ticket endpoint\n",
);
