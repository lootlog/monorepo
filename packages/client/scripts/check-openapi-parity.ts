import { authApiAdditions } from "./auth-api-additions.js";
import {
  decodeOpenApiDocument,
  isJsonArray,
  isJsonObject,
  type OpenApiDocument,
  type JsonValue,
} from "./openapi-document.js";
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
const GUILD_METADATA_ERROR_OPERATIONS = new Set([
  "GET /guilds/{guildId}",
  "GET /guilds/{guildId}/permissions",
]);
const ORGANIZATION_NOT_FOUND_OPERATIONS = new Set([
  "GET /guilds/{guildId}/members",
  "GET /guilds/{guildId}/members/references",
  "GET /guilds/{guildId}/members/summary",
  "POST /guilds/{guildId}/members/refresh-all",
  "GET /guilds/{guildId}/chat-messages",
  "POST /guilds/{guildId}/chat-messages",
  "DELETE /guilds/{guildId}/chat-messages",
  "PATCH /guilds/{guildId}/chat-messages/{messageId}",
  "DELETE /guilds/{guildId}/chat-messages/{messageId}",
]);
// Domain and access failures now retain their 4xx status and structured reason.
const RESERVATION_ERROR_STATUSES = new Map<string, readonly string[]>([
  ["GET /guilds/{guildId}/reservation-spots", ["401", "403", "404"]],
  [
    "GET /guilds/{guildId}/reservation-spots/{spotId}/reservations",
    ["400", "401", "403", "404"],
  ],
  [
    "POST /guilds/{guildId}/reservation-spots/{spotId}/reservations",
    ["401", "403", "404", "409", "422"],
  ],
  [
    "DELETE /guilds/{guildId}/reservations/{reservationId}",
    ["401", "403", "404"],
  ],
  [
    "PUT /guilds/{guildId}/reservation-spot-pins/{spotId}",
    ["401", "403", "404"],
  ],
  [
    "DELETE /guilds/{guildId}/reservation-spot-pins/{spotId}",
    ["401", "403", "404"],
  ],
  ["GET /users/@me/reservations", ["401"]],
  ["DELETE /users/@me/reservations/{reservationId}", ["401", "404"]],
  [
    "PATCH /users/@me/reservations/{reservationId}",
    ["401", "404", "409", "422"],
  ],
  ["GET /guilds/{guildId}/reservation-shares", ["401", "403", "404"]],
  [
    "POST /guilds/{guildId}/reservation-share-invitations",
    ["401", "403", "404"],
  ],
  [
    "DELETE /guilds/{guildId}/reservation-share-invitations/{invitationId}",
    ["401", "403", "404"],
  ],
  [
    "DELETE /guilds/{guildId}/reservation-shares/{shareId}",
    ["401", "403", "404"],
  ],
  ["GET /reservation-share-invitations/{token}", ["401", "404", "409", "410"]],
  ["POST /reservation-share-invitations/{token}", ["401", "404", "409", "410"]],
]);
// Explicit response migrations, verified against the handlers and fixed baseline.
// The first statuses replace empty responses; the second statuses are additions.
const API_ERROR_RESPONSE_MIGRATIONS = [
  { restore: ["503"], add: [], operations: ["DELETE /users/@me"] },
  {
    restore: [],
    add: ["403", "404"],
    operations: [
      "GET /guilds/{guildId}",
      "GET /guilds/{guildId}/config",
      "GET /guilds/{guildId}/worlds",
      "GET /guilds/{guildId}/permissions",
      "GET /guilds/{guildId}/discord-sync",
    ],
  },
  {
    restore: [],
    add: ["400", "403", "404", "409"],
    operations: [
      "PATCH /guilds/{guildId}/config",
      "POST /guilds/{guildId}/timers/history/{historyEntryId}/restore",
    ],
  },
  {
    restore: [],
    add: ["403", "404", "429"],
    operations: ["POST /guilds/{guildId}/discord-sync/refresh"],
  },
  {
    restore: ["403"],
    add: [],
    operations: [
      "GET /guilds/{guildId}/timers",
      "GET /guilds/{guildId}/timers/npcs/search",
    ],
  },
  { restore: ["400", "403"], add: ["409"], operations: ["POST /timers/auto"] },
  {
    restore: ["403", "404"],
    add: ["400"],
    operations: [
      "PATCH /guilds/{guildId}/timers/{timerIdentifier}/reset",
      "DELETE /guilds/{guildId}/timers/{timerIdentifier}",
    ],
  },
  {
    restore: [],
    add: ["400", "403", "404"],
    operations: ["GET /guilds/{guildId}/timers/{timerIdentifier}/history"],
  },
  {
    restore: ["403"],
    add: ["400", "404"],
    operations: ["POST /guilds/{guildId}/timers/manual"],
  },
  {
    restore: [],
    add: ["400"],
    operations: [
      "PATCH /timer-settings",
      "POST /guilds/{guildId}/notifications/targets",
      "POST /users/@me/notifications/targets",
      "PATCH /sound-settings",
    ],
  },
  {
    restore: [],
    add: ["400", "403"],
    operations: [
      "GET /timer-settings/guilds/{guildId}",
      "PATCH /timer-settings/guilds/{guildId}",
      "POST /timer-settings/migrate",
      "GET /preferences",
      "PATCH /preferences",
    ],
  },
  {
    restore: ["403"],
    add: ["404"],
    operations: [
      "GET /guilds/{guildId}/loots",
      "GET /guilds/{guildId}/loots/stats",
      "GET /guilds/{guildId}/loots/count",
      "GET /guilds/{guildId}/loots/items/resolve",
      "GET /guilds/{guildId}/stats/kills",
      "GET /guilds/{guildId}/stats/kills/top-npcs",
      "GET /guilds/{guildId}/stats/kills/top-killers",
    ],
  },
  {
    restore: ["403", "404"],
    add: [],
    operations: [
      "GET /guilds/{guildId}/loots/{lootId}",
      "DELETE /guilds/{guildId}/loots/{lootId}",
      "GET /guilds/{guildId}/loots/{lootId}/comments",
      "POST /guilds/{guildId}/loots/{lootId}/comments",
      "GET /guilds/{guildId}/stats/kills/npcs/{npcId}/killers",
      "GET /guilds/{guildId}/stats/kills/members/{memberId}",
    ],
  },
  { restore: [], add: ["400", "403", "503"], operations: ["POST /loots"] },
  {
    restore: ["404"],
    add: ["400", "403", "409", "503"],
    operations: ["PATCH /loots/{id}"],
  },
  {
    restore: ["403", "404"],
    add: ["401"],
    operations: [
      "GET /guilds/{guildId}/lootlog-config",
      "PUT /guilds/{guildId}/lootlog-config/{npcId}",
    ],
  },
  {
    restore: [],
    add: ["404"],
    operations: [
      "DELETE /guilds/{guildId}/notifications/targets/{targetId}",
      "PATCH /guilds/{guildId}/notifications/targets/{targetId}",
      "DELETE /guilds/{guildId}/notifications/rules/{ruleId}",
      "POST /guilds/{guildId}/notifications/rules/{ruleId}/rebuild-jobs",
      "DELETE /users/@me/notifications/targets/{targetId}",
      "PATCH /users/@me/notifications/targets/{targetId}",
      "DELETE /users/@me/notifications/rules/{ruleId}",
      "DELETE /users/@me/notifications/watched-items/{watchedItemId}",
    ],
  },
  {
    restore: [],
    add: ["400", "404", "409"],
    operations: [
      "POST /guilds/{guildId}/notifications/rules",
      "POST /guilds/{guildId}/notifications/rules/{ruleId}/test",
    ],
  },
  {
    restore: [],
    add: ["400", "404"],
    operations: [
      "PATCH /guilds/{guildId}/notifications/rules/{ruleId}",
      "PATCH /users/@me/notifications/rules/{ruleId}",
    ],
  },
  {
    restore: ["400"],
    add: ["404"],
    operations: ["DELETE /guilds/{guildId}/notifications/jobs/{jobId}"],
  },
  {
    restore: ["409"],
    add: ["400", "404"],
    operations: ["POST /users/@me/notifications/targets/{targetId}/test"],
  },
  {
    restore: [],
    add: ["400", "409"],
    operations: [
      "POST /users/@me/notifications/rules",
      "POST /users/@me/notifications/watched-items",
      "POST /users/@me/notifications/watched-items/quick-add",
    ],
  },
  {
    restore: [],
    add: ["400", "401", "403", "409", "503"],
    operations: ["POST /messaging"],
  },
  {
    restore: [],
    add: ["400", "401", "403"],
    operations: ["POST /messaging/{notificationId}/volunteer"],
  },
  { restore: [], add: ["401"], operations: ["GET /messaging/party-gathering"] },
  {
    restore: [],
    add: ["401", "403", "409"],
    operations: ["POST /messaging/party-gathering"],
  },
  {
    restore: [],
    add: ["401", "403", "404", "422"],
    operations: [
      "GET /messaging/party-gathering/{notificationId}",
      "POST /messaging/party-gathering/{notificationId}/invitations/targets",
    ],
  },
  {
    restore: [],
    add: ["401", "403", "404", "409", "422"],
    operations: [
      "POST /messaging/party-gathering/{notificationId}/applications",
      "DELETE /messaging/party-gathering/{notificationId}/applications/me",
      "DELETE /messaging/party-gathering/{notificationId}/participants",
      "POST /messaging/party-gathering/{notificationId}/party-observation",
      "POST /messaging/party-gathering/{notificationId}/cancel",
    ],
  },
  {
    restore: ["403"],
    add: ["400"],
    operations: ["POST /guilds/{guildId}/events"],
  },
  {
    restore: ["404"],
    add: [],
    operations: [
      "GET /guilds/{guildId}/events/{eventId}",
      "DELETE /guilds/{guildId}/events/{eventId}",
      "GET /guilds/{guildId}/events/{eventId}/overview",
      "GET /guilds/{guildId}/events/{eventId}/wrapped",
      "GET /guilds/{guildId}/events/{eventId}/maps",
      "POST /guilds/{guildId}/events/{eventId}/recalculate-points",
      "POST /guilds/{guildId}/events/{eventId}/maps/{mapId}/assign",
      "DELETE /guilds/{guildId}/events/{eventId}/maps/{mapId}/assign",
      "POST /guilds/{guildId}/events/{eventId}/maps/{mapId}/self-assign",
      "DELETE /guilds/{guildId}/events/{eventId}/maps/{mapId}/self-assign",
      "DELETE /guilds/{guildId}/events/{eventId}/heroes/{heroId}/locations/{locationId}",
      "PATCH /guilds/{guildId}/events/{eventId}/heroes/{heroId}/locations/{locationId}",
      "PATCH /guilds/{guildId}/events/{eventId}/heroes/{heroId}/maps/{mapId}/location",
      "GET /guilds/{guildId}/events/{eventId}/ranking",
      "PATCH /guilds/{guildId}/events/{eventId}/ranking/{rankingId}",
      "GET /guilds/{guildId}/events/{eventId}/timers",
      "GET /guilds/{guildId}/events/{eventId}/hero-stats",
      "GET /guilds/{guildId}/events/{eventId}/kills",
      "GET /guilds/{guildId}/events/{eventId}/members/{memberId}/kills",
      "GET /guilds/{guildId}/events/{eventId}/heroes/{heroId}/kills",
      "GET /guilds/{guildId}/events/{eventId}/heroes/{heroId}/kills/{killId}",
      "PATCH /guilds/{guildId}/events/{eventId}/kills/{killId}/points/{killPointId}",
      "GET /guilds/{guildId}/events/{eventId}/heroes/{heroId}/kills/{killId}/timeline",
    ],
  },
  {
    restore: ["404"],
    add: ["400"],
    operations: ["PATCH /guilds/{guildId}/events/{eventId}"],
  },
  {
    restore: ["400"],
    add: [],
    operations: [
      "POST /guilds/{guildId}/events/{eventId}/heroes/{heroId}/locations",
      "POST /kills",
    ],
  },
  {
    restore: ["400", "404"],
    add: ["409"],
    operations: [
      "POST /guilds/{guildId}/events/{eventId}/heroes/{heroId}/close-respawn-window",
      "POST /guilds/{guildId}/events/{eventId}/heroes/{heroId}/open-respawn-window",
    ],
  },
  {
    restore: ["404", "409"],
    add: [],
    operations: ["PUT /guilds/{guildId}/events/{eventId}/pin"],
  },
] as const;
const apiErrorResponseMigrations = new Map<
  string,
  { readonly restore: readonly string[]; readonly add: readonly string[] }
>(
  API_ERROR_RESPONSE_MIGRATIONS.flatMap((migration) =>
    migration.operations.map((operation) => [operation, migration] as const),
  ),
);
const ACTIVITY_UNAVAILABLE_OPERATIONS = new Set([
  "GET /guilds/{guildId}/activity-logs",
  "GET /guilds/{guildId}/activity-logs/actor-name-suggestions",
  "GET /guilds/{guildId}/activity-logs/world-suggestions",
  "GET /guilds/{guildId}/activity-logs/clan-name-suggestions",
  "GET /guilds/{guildId}/users/{userId}/activity-logs",
  "GET /guilds/{guildId}/member-activity-stats",
  "GET /guilds/{guildId}/activity-logs/{id}",
  "DELETE /guilds/{guildId}/activity-logs/{id}",
]);
const BATTLELOG_INVALID_REQUEST_OPERATIONS = new Set([
  "POST /battles",
  "PATCH /battles/{battleId}",
  "POST /internal/delete-user-data",
]);
// Inline schemas correspond to AuthorizationUnavailable and BadRequestResponse.
const ACTIVITY_UNAVAILABLE_SCHEMA: JsonValue = {
  type: "object",
  properties: {
    message: { type: "string" },
    statusCode: { type: "number", enum: [503] },
  },
  required: ["message", "statusCode"],
};
const BATTLELOG_INVALID_REQUEST_SCHEMA: JsonValue = {
  type: "object",
  properties: {
    error: { type: "string" },
    message: {
      anyOf: [
        { type: "string" },
        {
          type: "array",
          items: {
            type: "object",
            properties: {
              path: {
                type: "array",
                items: {
                  anyOf: [
                    { type: "string" },
                    {
                      anyOf: [
                        { type: "number" },
                        {
                          type: "string",
                          enum: ["Infinity", "-Infinity", "NaN"],
                        },
                      ],
                    },
                  ],
                },
              },
              message: { type: "string" },
            },
            required: ["path", "message"],
          },
        },
      ],
    },
    statusCode: { type: "number", enum: [400] },
  },
  required: ["error", "message", "statusCode"],
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

const readBaseline = (
  service: string,
  revision = BASELINE_SHA,
): OpenApiDocument => {
  const result = spawnSync(
    "git",
    ["show", `${revision}:apps/${service}/openapi.yaml`],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `Unable to read baseline OpenAPI for ${service}: ${result.stderr.trim()}`,
    );
  }
  return decodeOpenApiDocument(parse(result.stdout));
};

const readCurrent = (service: string): OpenApiDocument =>
  decodeOpenApiDocument(
    parse(
      readFileSync(
        resolve(repositoryRoot, `apps/${service}/openapi.yaml`),
        "utf8",
      ),
    ),
  );

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
  if (isJsonArray(value)) {
    return value
      .filter((item) => item !== "LOOTLOG_PRESENCE_LOCATION_READ")
      .map(removePresencePermission);
  }
  if (isJsonObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        removePresencePermission(item),
      ]),
    );
  }
  return value;
};

const removeResponseStatus = (value: JsonValue, status: string): JsonValue => {
  if (!isJsonObject(value)) {
    return value;
  }
  const operation = structuredClone(value);
  const responses = operation["responses"];
  if (isJsonObject(responses)) {
    return {
      ...operation,
      responses: Object.fromEntries(
        Object.entries(responses).filter(([key]) => key !== status),
      ),
    };
  }
  return operation;
};

export const normalizeOpenApiRepresentation = (value: JsonValue): JsonValue => {
  if (isJsonArray(value)) {
    const normalized = value.map(normalizeOpenApiRepresentation);
    if (
      normalized.every(
        (item): item is { in: string; name: string } =>
          item !== null &&
          !isJsonArray(item) &&
          typeof item === "object" &&
          typeof item["name"] === "string" &&
          typeof item["in"] === "string",
      )
    ) {
      return normalized.sort((left, right) => {
        const leftKey = `${left.in}:${left.name}`;
        const rightKey = `${right.in}:${right.name}`;
        return leftKey.localeCompare(rightKey);
      });
    }
    return normalized;
  }
  if (!isJsonObject(value)) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          key !== "description" && key !== "example" && key !== "examples",
      )
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [
        key,
        key === "enum" && isJsonArray(item)
          ? item
              .map(normalizeOpenApiRepresentation)
              .sort((left, right) =>
                JSON.stringify(left).localeCompare(JSON.stringify(right)),
              )
          : normalizeOpenApiRepresentation(item),
      ]),
  );
};

const assertOrganizationNotFoundResponse = (
  operation: JsonValue,
  operationKey: string,
): void => {
  const responses = isJsonObject(operation)
    ? operation["responses"]
    : undefined;
  if (!isJsonObject(responses) || responses["404"] === undefined) {
    throw new Error(`${operationKey} must declare a 404 response`);
  }
};

const assertErrorResponse = (
  operation: JsonValue,
  operationKey: string,
  status: string,
  schemaName = "OrganizationWorkspaceErrorResponse",
  schema: JsonValue = { $ref: `#/components/schemas/${schemaName}` },
): void => {
  const responses = isJsonObject(operation)
    ? operation["responses"]
    : undefined;
  const response = isJsonObject(responses) ? responses[status] : undefined;
  const expected = {
    content: {
      "application/json": {
        schema,
      },
    },
  };
  if (
    response === undefined ||
    JSON.stringify(normalizeOpenApiRepresentation(response)) !==
      JSON.stringify(normalizeOpenApiRepresentation(expected))
  ) {
    throw new Error(`${operationKey} must declare a ${status} ${schemaName}`);
  }
};

const normalizeErrorResponseMigrations = (
  service: string,
  operationKey: string,
  operation: JsonValue,
): JsonValue => {
  let normalized = operation;
  if (service === "api") {
    const migration = apiErrorResponseMigrations.get(operationKey);
    if (migration) {
      for (const status of [...migration.restore, ...migration.add]) {
        assertErrorResponse(
          normalized,
          operationKey,
          status,
          "HttpErrorResponse",
        );
        normalized = removeResponseStatus(normalized, status);
      }
      if (isJsonObject(normalized)) {
        const responses = normalized["responses"];
        if (isJsonObject(responses)) {
          const restoredResponses = { ...responses };
          for (const status of migration.restore)
            restoredResponses[status] = {};
          normalized = { ...normalized, responses: restoredResponses };
        }
      }
    }
  }

  if (
    service === "activity" &&
    ACTIVITY_UNAVAILABLE_OPERATIONS.has(operationKey)
  ) {
    assertErrorResponse(
      normalized,
      operationKey,
      "503",
      "AuthorizationUnavailable",
      ACTIVITY_UNAVAILABLE_SCHEMA,
    );
    normalized = removeResponseStatus(normalized, "503");
  }
  if (
    service === "battlelog" &&
    BATTLELOG_INVALID_REQUEST_OPERATIONS.has(operationKey)
  ) {
    assertErrorResponse(
      normalized,
      operationKey,
      "400",
      "BadRequestResponse",
      BATTLELOG_INVALID_REQUEST_SCHEMA,
    );
    normalized = removeResponseStatus(normalized, "400");
  }
  return normalized;
};

// Discord's current-user guild summaries have no persisted Organization settings.
// Verified by account-organization.operations.test.ts through the real HTTP encoder.
const MANAGEABLE_ORGANIZATION_SCHEMA: JsonValue = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    icon: { nullable: true, type: "string" },
  },
  required: ["id", "name"],
  additionalProperties: false,
};

const normalizeManageableOrganizationResponse = (
  operation: JsonValue,
  schemas?: Record<string, JsonValue>,
): JsonValue => {
  if (
    !schemas?.["ManageableOrganizationResponse"] ||
    JSON.stringify(
      normalizeOpenApiRepresentation(schemas["ManageableOrganizationResponse"]),
    ) !==
      JSON.stringify(
        normalizeOpenApiRepresentation(MANAGEABLE_ORGANIZATION_SCHEMA),
      )
  ) {
    throw new Error("ManageableOrganizationResponse contract changed");
  }
  assertErrorResponse(
    operation,
    "GET /guilds/@me/manageable",
    "200",
    "ManageableOrganizationResponse",
    {
      type: "array",
      items: { $ref: "#/components/schemas/ManageableOrganizationResponse" },
    },
  );
  if (isJsonObject(operation)) {
    const responses = operation["responses"];
    if (isJsonObject(responses)) {
      operation = {
        ...operation,
        responses: {
          ...responses,
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/GuildResponseDto" },
                },
              },
            },
          },
        },
      };
    }
  }
  return operation;
};

const normalizeServiceAuthentication = (
  service: string,
  operationKey: string,
  operation: JsonValue,
): JsonValue => {
  let normalized = operation;
  // Verified by Auth application and Battlelog HTTP service-credential tests.
  if (
    (service === "auth" && operationKey === "POST /auth/idp-token") ||
    (service === "battlelog" &&
      operationKey === "POST /internal/delete-user-data")
  ) {
    const authorizationParameter = [
      {
        name: "authorization",
        in: "header",
        required: false,
        schema: { nullable: true, type: "string" },
      },
    ];
    if (
      !isJsonObject(normalized) ||
      JSON.stringify(
        normalizeOpenApiRepresentation(normalized.parameters ?? null),
      ) !==
        JSON.stringify(normalizeOpenApiRepresentation(authorizationParameter))
    )
      throw new Error(
        `${operationKey} must declare the service authorization header`,
      );
    const properties = {
      message: { type: "string" },
      statusCode: { type: "number", enum: [401] },
    };
    const unauthorizedSchema = {
      type: "object",
      properties:
        service === "battlelog"
          ? { error: { type: "string" }, ...properties }
          : properties,
      required:
        service === "battlelog"
          ? ["error", "message", "statusCode"]
          : ["message", "statusCode"],
    };
    assertErrorResponse(
      normalized,
      operationKey,
      "401",
      "service authentication error",
      service === "auth"
        ? {
            anyOf: [
              unauthorizedSchema,
              {
                type: "object",
                properties: { error: { type: "string" } },
                required: ["error"],
              },
            ],
          }
        : unauthorizedSchema,
    );
    normalized = removeResponseStatus({ ...normalized, parameters: [] }, "401");
  }
  return normalized;
};

export const normalizeAllowedChanges = (
  service: string,
  operationKey: string,
  operation: JsonValue,
  schemas?: Record<string, JsonValue>,
): JsonValue => {
  let normalized = normalizeServiceAuthentication(
    service,
    operationKey,
    operation,
  );
  if (service === "auth" && operationKey === "GET /auth/verify") {
    for (const status of ["401", "429", "503"]) {
      assertErrorResponse(
        normalized,
        operationKey,
        status,
        "API key verification error",
        {
          type: "object",
          properties: { message: { type: "string" } },
          required: ["message"],
        },
      );
      normalized = removeResponseStatus(normalized, status);
    }
  }
  if (service === "api" && operationKey === "GET /guilds/@me/manageable") {
    normalized = normalizeManageableOrganizationResponse(normalized, schemas);
  }
  if (service === "api") normalized = removePresencePermission(normalized);
  normalized = normalizeErrorResponseMigrations(
    service,
    operationKey,
    normalized,
  );
  // Search outages now return an explicit 503 instead of a successful empty result.
  if (
    service === "search" &&
    new Set(["GET /players", "GET /npcs", "GET /items", "GET /all"]).has(
      operationKey,
    )
  ) {
    normalized = removeResponseStatus(normalized, "503");
  }

  if (service === "api" && GUILD_METADATA_ERROR_OPERATIONS.has(operationKey)) {
    normalized = removeResponseStatus(normalized, "403");
    // Missing Organizations now return 404 instead of an internal server error.
    normalized = removeResponseStatus(normalized, "404");
  }
  // Verified by the real authorization HTTP tests: missing Organizations return 404.
  if (
    service === "api" &&
    ORGANIZATION_NOT_FOUND_OPERATIONS.has(operationKey)
  ) {
    assertOrganizationNotFoundResponse(normalized, operationKey);
    normalized = removeResponseStatus(normalized, "404");
  }
  if (service === "api") {
    for (const status of RESERVATION_ERROR_STATUSES.get(operationKey) ?? []) {
      assertErrorResponse(normalized, operationKey, status);
      normalized = removeResponseStatus(normalized, status);
    }
  }

  if (
    isJsonObject(normalized) &&
    isJsonArray(normalized["security"]) &&
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
    (!isJsonObject(left) && !isJsonArray(left)) ||
    (!isJsonObject(right) && !isJsonArray(right)) ||
    isJsonArray(left) !== isJsonArray(right)
  ) {
    return [`${path}: ${JSON.stringify(left)} -> ${JSON.stringify(right)}`];
  }

  const leftEntries = isJsonArray(left) ? left.entries() : Object.entries(left);
  const rightKeys = new Set(
    isJsonArray(right) ? [...right.keys()].map(String) : Object.keys(right),
  );
  const differences: string[] = [];
  for (const [key, leftValue] of leftEntries) {
    const stringKey = String(key);
    rightKeys.delete(stringKey);
    const rightValue = isJsonArray(right)
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
          isJsonArray(right) ? right[Number(key)] : right[key],
        )}`,
    ),
  );
  return differences;
};

// Intentional private additions verified against real persistence and authorization tests:
// activity/src/online/online-repository.integration.test.ts;
// api/test/kill-analytics.integration.test.ts, user-feed.integration.test.ts and records.operations.test.ts.
const PERSONAL_ANALYTICS_ADDITIONS = new Map<
  string,
  Partial<Record<string, JsonValue>>
>(
  Object.entries({
    auth: authApiAdditions,
    activity: {
      "GET /users/@me/activity/online": {
        operationId: "UsersActivityController_getOnline",
        parameters: ["from", "to"].map((name) => ({
          name,
          in: "query",
          required: true,
          schema: { type: "string" },
        })),
        security: [{ bearer: [] }],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserOnlineResponseDto" },
              },
            },
          },
          "401": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    statusCode: { type: "number", enum: [401] },
                  },
                  required: ["message", "statusCode"],
                },
              },
            },
          },
        },
      },
    },
    api: {
      "GET /users/@me/feed": {
        operationId: "UsersController_getUserFeed",
        parameters: [],
        security: [{ bearer: [] }],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserFeedResponseDto_Output",
                },
              },
            },
          },
        },
      },
      ...Object.fromEntries(
        (
          [
            [
              "analytics",
              "KillsController_getUserKillAnalytics",
              "UserKillAnalyticsResponseDto_Output",
            ],
            [
              "activity",
              "KillsController_getUserKillActivity",
              "UserKillActivityResponseDto_Output",
            ],
          ] as const
        ).map(([path, operationId, response]): [string, JsonValue] => [
          `GET /users/@me/stats/kills/${path}`,
          {
            operationId,
            parameters: [
              ...(path === "analytics"
                ? [
                    {
                      name: "days",
                      in: "query",
                      required: false,
                      schema: {
                        type: "string",
                        enum: ["7", "30", "90", "365"],
                      },
                    },
                  ]
                : []),
              {
                name: "world",
                in: "query",
                required: false,
                schema: { type: "string", minLength: 1, maxLength: 100 },
              },
            ],
            security: [{ bearer: [] }],
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: { $ref: `#/components/schemas/${response}` },
                  },
                },
              },
            },
          },
        ]),
      ),
    },
  } satisfies Record<string, Record<string, JsonValue>>),
);

export const assertVerifiedPersonalAddition = (
  service: string,
  operationKey: string,
  operation: JsonValue | undefined,
): void => {
  const expected = PERSONAL_ANALYTICS_ADDITIONS.get(service)?.[operationKey];
  if (!expected || !isJsonObject(operation)) {
    throw new Error(
      `Unverified personal API addition: ${service} ${operationKey}`,
    );
  }
  const keyNormalized =
    service === "auth" ? operation : normalizeApiKeyErrors(operation, expected);
  if (!isJsonObject(keyNormalized)) throw new Error("Invalid operation");
  const { tags: _tags, summary: _summary, ...contract } = keyNormalized;
  if (
    JSON.stringify(normalizeOpenApiRepresentation(contract)) !==
    JSON.stringify(normalizeOpenApiRepresentation(expected))
  ) {
    throw new Error(
      `Verified personal API contract changed: ${service} ${operationKey}`,
    );
  }
};

// Verified by credential boundary tests in all four services. Preserve every
// previous response; only the exact middleware error alternative is permitted.
export const normalizeApiKeyErrors = (
  operation: JsonValue,
  previous: JsonValue | undefined,
): JsonValue => {
  if (!isJsonObject(operation) || !isJsonObject(operation.responses))
    return operation;
  const responses = { ...operation.responses };
  const previousResponses =
    isJsonObject(previous) && isJsonObject(previous.responses)
      ? previous.responses
      : {};
  for (const status of ["401", "403", "429"]) {
    const response = responses[status];
    if (!isJsonObject(response) || !isJsonObject(response.content)) continue;
    const media = response.content["application/json"];
    if (!isJsonObject(media) || !isJsonObject(media.schema)) continue;
    const schema = media.schema;
    const alternatives = isJsonArray(schema.anyOf) ? schema.anyOf : [schema];
    const remaining = alternatives.filter((alternative) => {
      if (!isJsonObject(alternative)) return true;
      const { additionalProperties, ...errorContract } = alternative;
      return (
        (additionalProperties !== undefined &&
          additionalProperties !== false) ||
        JSON.stringify(normalizeOpenApiRepresentation(errorContract)) !==
          JSON.stringify(
            normalizeOpenApiRepresentation({
              type: "object",
              properties: { message: { type: "string" } },
              required: ["message"],
            }),
          )
      );
    });
    if (remaining.length === alternatives.length) continue;
    if (remaining.length === 0) {
      if (previousResponses[status] === undefined) delete responses[status];
      else {
        const previousResponse = previousResponses[status];
        if (
          isJsonObject(previousResponse) &&
          previousResponse.content !== undefined &&
          JSON.stringify(normalizeOpenApiRepresentation(previousResponse)) !==
            JSON.stringify(normalizeOpenApiRepresentation(response))
        ) {
          throw new Error(
            `API key errors replaced an existing ${status} response`,
          );
        }
        responses[status] = previousResponse;
      }
    } else {
      responses[status] = {
        ...response,
        content: {
          ...response.content,
          "application/json": {
            ...media,
            schema:
              remaining.length === 1 && remaining[0] !== undefined
                ? remaining[0]
                : { anyOf: remaining },
          },
        },
      };
    }
  }
  return { ...operation, responses };
};

if (import.meta.main) {
  const changedOperations: string[] = [];
  for (const service of services) {
    const baseline = operations(readBaseline(service.baseline));
    const currentDocument = readCurrent(service.current);
    const current = operations(currentDocument);
    if (service.current !== "auth") {
      const beforeKeys = operations(
        readBaseline(
          service.current,
          "f44143e3396fd68ff6c947b728984d90f0602a0b",
        ),
      );
      for (const [key, operation] of current) {
        current.set(key, normalizeApiKeyErrors(operation, beforeKeys.get(key)));
      }
    }

    const additions = [...current.keys()].filter((key) => !baseline.has(key));
    const removals = [...baseline.keys()].filter((key) => !current.has(key));
    const expectedAdditions = Object.keys(
      PERSONAL_ANALYTICS_ADDITIONS.get(service.current) ?? {},
    );
    if (
      additions.length !== expectedAdditions.length ||
      additions.some((key) => !expectedAdditions.includes(key))
    ) {
      throw new Error(
        `${service.current} has unexpected OpenAPI additions: ${additions.join(", ") || "none"}`,
      );
    }
    for (const key of additions) {
      assertVerifiedPersonalAddition(service.current, key, current.get(key));
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
        currentDocument.components?.schemas,
      );
      const normalizedBaseline =
        normalizeOpenApiRepresentation(baselineOperation);
      if (JSON.stringify(normalized) !== JSON.stringify(normalizedBaseline)) {
        const paths = differencePaths(normalizedBaseline, normalized).slice(
          0,
          4,
        );
        changedOperations.push(
          `${service.current}: ${key} (${paths.join(", ")})`,
        );
      }
    }
  }

  if (changedOperations.length > 0) {
    throw new Error(
      `OpenAPI operations changed:\n${changedOperations.join("\n")}`,
    );
  }

  process.stdout.write(
    "OpenAPI parity passed: 243 baseline operations plus verified private analytics additions\n",
  );
}
