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

export const normalizeOpenApiRepresentation = (value: JsonValue): JsonValue => {
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
      .map(([key, item]) => [
        key,
        key === "enum" && Array.isArray(item)
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
  const responses =
    operation !== null &&
    typeof operation === "object" &&
    !Array.isArray(operation)
      ? operation["responses"]
      : undefined;
  if (
    responses === null ||
    typeof responses !== "object" ||
    Array.isArray(responses) ||
    responses["404"] === undefined
  ) {
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
  const responses =
    operation !== null &&
    typeof operation === "object" &&
    !Array.isArray(operation)
      ? operation["responses"]
      : undefined;
  const response =
    responses !== null &&
    typeof responses === "object" &&
    !Array.isArray(responses)
      ? responses[status]
      : undefined;
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
      if (
        normalized !== null &&
        typeof normalized === "object" &&
        !Array.isArray(normalized)
      ) {
        const responses = normalized["responses"];
        if (
          responses !== null &&
          typeof responses === "object" &&
          !Array.isArray(responses)
        ) {
          for (const status of migration.restore) responses[status] = {};
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

export const normalizeAllowedChanges = (
  service: string,
  operationKey: string,
  operation: JsonValue,
): JsonValue => {
  let normalized = operation;
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

// Intentional private additions verified against real persistence and authorization tests:
// activity/src/online/online-repository.integration.test.ts;
// api/test/kill-analytics.integration.test.ts, user-feed.integration.test.ts and records.operations.test.ts.
const PERSONAL_ANALYTICS_ADDITIONS: Record<
  string,
  Record<string, JsonValue>
> = {
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
                    schema: { type: "string", enum: ["7", "30", "90", "365"] },
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
};

export const assertVerifiedPersonalAddition = (
  service: string,
  operationKey: string,
  operation: JsonValue | undefined,
): void => {
  const expected = PERSONAL_ANALYTICS_ADDITIONS[service]?.[operationKey];
  if (
    !expected ||
    !operation ||
    typeof operation !== "object" ||
    Array.isArray(operation)
  ) {
    throw new Error(
      `Unverified personal API addition: ${service} ${operationKey}`,
    );
  }
  const { tags: _tags, summary: _summary, ...contract } = operation;
  if (
    JSON.stringify(normalizeOpenApiRepresentation(contract)) !==
    JSON.stringify(normalizeOpenApiRepresentation(expected))
  ) {
    throw new Error(
      `Verified personal API contract changed: ${service} ${operationKey}`,
    );
  }
};

if (import.meta.main) {
  const changedOperations: string[] = [];
  for (const service of services) {
    const baseline = operations(readBaseline(service.baseline));
    const current = operations(readCurrent(service.current));

    const additions = [...current.keys()].filter((key) => !baseline.has(key));
    const removals = [...baseline.keys()].filter((key) => !current.has(key));
    const expectedAdditions =
      service.current === "auth"
        ? [REALTIME_TICKET_OPERATION]
        : Object.keys(PERSONAL_ANALYTICS_ADDITIONS[service.current] ?? {});
    if (
      additions.length !== expectedAdditions.length ||
      additions.some((key) => !expectedAdditions.includes(key))
    ) {
      throw new Error(
        `${service.current} has unexpected OpenAPI additions: ${additions.join(", ") || "none"}`,
      );
    }
    for (const key of additions) {
      if (service.current !== "auth")
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
    "OpenAPI parity passed: 243 baseline operations plus verified realtime ticket and private analytics additions\n",
  );
}
