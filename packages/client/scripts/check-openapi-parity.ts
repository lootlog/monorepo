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
import { resolve } from "node:path";
import { parse } from "yaml";

const BASELINE_SHA = "633f8f0157cca04ef2b609ba0e2f1903b1c28949";

// Optional reader filters for the Web dashboard feed; omitted filters keep the
// previous response, so API key callers are unaffected.
/** Omitting it names the global chat channel every world shares. */
const GLOBAL_CHAT_WORLD_PARAMETER: JsonValue = {
  name: "world",
  in: "query",
  schema: { type: "string", minLength: 1, maxLength: 64 },
  required: false,
};

const USER_KILL_WORLD_PARAMETER = {
  name: "world",
  in: "query",
  required: false,
  schema: { type: "string", minLength: 1, maxLength: 100 },
} as const;

const USER_KILL_CHARACTER_PARAMETER = {
  name: "characterId",
  in: "query",
  required: false,
  schema: { type: "string", minLength: 1, maxLength: 100 },
} as const;

const USER_FEED_PARAMETERS: JsonValue[] = [
  {
    name: "excludedGuildIds",
    in: "query",
    schema: { type: "array", items: { type: "string" } },
    required: false,
  },
  {
    name: "excludedNpcCategories",
    in: "query",
    schema: {
      type: "array",
      items: {
        type: "string",
        enum: ["ELITE2", "HERO", "COLOSSUS", "TITAN", "OTHER"],
      },
    },
    required: false,
  },
  {
    name: "withLootOnly",
    in: "query",
    schema: { type: "boolean" },
    required: false,
  },
];

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
  // Verified by the hero name cases in the event update spec: adding or
  // renaming a hero onto a name used by another hero or leftover rankings is
  // a 409.
  {
    restore: [],
    add: ["404", "409"],
    operations: [
      "POST /guilds/{guildId}/events/{eventId}/heroes",
      "PATCH /guilds/{guildId}/events/{eventId}/heroes/{heroId}",
    ],
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
  "GET /battles/@me",
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

const repositoryRoot = resolve(import.meta.dirname, "../../..");

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

const sameOpenApiContract = (left: JsonValue, right: JsonValue): boolean =>
  JSON.stringify(normalizeOpenApiRepresentation(left)) ===
  JSON.stringify(normalizeOpenApiRepresentation(right));

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

  if (response === undefined || !sameOpenApiContract(response, expected)) {
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
    !sameOpenApiContract(
      schemas["ManageableOrganizationResponse"],
      MANAGEABLE_ORGANIZATION_SCHEMA,
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
      !sameOpenApiContract(
        normalized.parameters ?? null,
        authorizationParameter,
      )
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

    if (service === "auth") {
      assertErrorResponse(
        normalized,
        operationKey,
        "400",
        "IDP request error",
        {
          anyOf: [
            {
              type: "object",
              properties: {
                message: { type: "string" },
                error: { type: "string" },
                statusCode: { type: "number", enum: [400] },
              },
              required: ["message", "error", "statusCode"],
            },
            {
              type: "object",
              properties: { error: { type: "string" } },
              required: ["error"],
            },
          ],
        },
      );
      normalized = removeResponseStatus(normalized, "400");
    }
  }

  return normalized;
};

const REMOVED_SEARCH_WORLD: JsonValue = {
  name: "world",
  in: "query",
  required: false,
  schema: { type: "string" },
};

const normalizeRemovedSearchWorld = (
  service: string,
  operationKey: string,
  operation: JsonValue,
): JsonValue => {
  if (
    service !== "search" ||
    !["GET /npcs", "GET /items"].includes(operationKey) ||
    !isJsonObject(operation) ||
    !isJsonArray(operation["parameters"])
  )
    return operation;

  // Verified by search/test/search-query.test.ts: every world of an edition
  // shares NPC and item ids, so the breaking SDK release removed `world`
  // from these operations; older callers that still send it get results.
  if (
    operation["parameters"].some(
      (parameter) => isJsonObject(parameter) && parameter["name"] === "world",
    )
  )
    throw new Error(`${operationKey} must not declare world`);

  return {
    ...operation,
    parameters: [...operation["parameters"], REMOVED_SEARCH_WORLD],
  };
};

const normalizeInternalPermissionFreshness = (
  service: string,
  operationKey: string,
  operation: JsonValue,
): JsonValue => {
  // Verified by Gateway's permission-revocation.test.ts through API HTTP decoding:
  // reconciliation opts out of the aggregate cache without changing ordinary reads.
  if (
    service !== "api" ||
    operationKey !== "GET /internal/guilds/user-permissions"
  )
    return operation;

  const expectedParameters: JsonValue[] = [
    {
      name: "discordId",
      in: "query",
      required: true,
      schema: { type: "string" },
    },
    {
      name: "userId",
      in: "query",
      required: true,
      schema: { type: "string" },
    },
    {
      name: "freshness",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["required"] },
    },
  ];

  if (
    !isJsonObject(operation) ||
    !sameOpenApiContract(operation.parameters ?? null, expectedParameters)
  ) {
    throw new Error(
      `${operationKey} must retain its optional required-freshness query`,
    );
  }

  return { ...operation, parameters: expectedParameters.slice(0, 2) };
};

const TIMER_NPC_SEARCH_ID_PARAMETERS = ["npcIds", "templateIds"];

const TIMER_NPC_SEARCH_CHANGED_PARAMETERS = [
  "search",
  "world",
  ...TIMER_NPC_SEARCH_ID_PARAMETERS,
];

const normalizeTimerNpcSearchQuery = (
  service: string,
  operationKey: string,
  operation: JsonValue,
): JsonValue => {
  // Verified by api/src/http-api/handlers/timers/timer-search.data-layer.test.ts
  // and the timer NPC search case in api/test/http-boundary.e2e-spec.ts:
  // `search` and `world` became optional and id lookups were added; callers
  // that send both keep their request shape.
  if (
    service !== "api" ||
    operationKey !== "GET /guilds/{guildId}/timers/npcs/search" ||
    !isJsonObject(operation) ||
    !isJsonArray(operation.parameters)
  )
    return operation;

  const parameters = operation.parameters.filter(isJsonObject);

  const idParameters = parameters.filter((parameter) =>
    TIMER_NPC_SEARCH_ID_PARAMETERS.some((name) => parameter.name === name),
  );

  const expectedChangedParameters: JsonValue[] = [
    ...["search", "world"].map((name) => ({
      name,
      in: "query",
      required: false,
      schema: { type: "string", minLength: 1 },
    })),
    ...TIMER_NPC_SEARCH_ID_PARAMETERS.map((name) => ({
      name,
      in: "query",
      required: false,
      schema: {
        type: "array",
        items: {
          type: "integer",
          minimum: 1,
          maximum: name === "npcIds" ? 2_147_483_647 : Number.MAX_SAFE_INTEGER,
        },
      },
    })),
  ];

  const changedParameters = parameters.filter((parameter) =>
    TIMER_NPC_SEARCH_CHANGED_PARAMETERS.some((name) => parameter.name === name),
  );

  if (!sameOpenApiContract(changedParameters, expectedChangedParameters)) {
    throw new Error(
      `${operationKey} must keep search and world optional and accept npcIds and templateIds arrays`,
    );
  }

  return {
    ...operation,
    parameters: parameters
      .filter((parameter) => !idParameters.includes(parameter))
      .map((parameter) =>
        parameter.name === "search" || parameter.name === "world"
          ? { ...parameter, required: true }
          : parameter,
      ),
  };
};

const ACTIVITY_LEGACY_HEALTH_DETAILS: JsonValue = {
  type: "object",
  additionalProperties: {
    type: "object",
    properties: { status: { type: "string" } },
    required: ["status"],
  },
};

const ACTIVITY_LEGACY_HEALTH_SCHEMA: JsonValue = {
  type: "object",
  properties: {
    status: { type: "string" },
    info: { ...ACTIVITY_LEGACY_HEALTH_DETAILS, nullable: true },
    error: { ...ACTIVITY_LEGACY_HEALTH_DETAILS, nullable: true },
    details: ACTIVITY_LEGACY_HEALTH_DETAILS,
  },
};

// LOO-218: activity-http.test.ts verifies that failed or stalled dependencies
// leave process liveness at 200; database failure is exposed only by /readyz.
const normalizeActivityLiveness = (
  service: string,
  operationKey: string,
  operation: JsonValue,
): JsonValue => {
  if (service !== "activity" || operationKey !== "GET /healthz")
    return operation;

  assertErrorResponse(
    operation,
    "GET /healthz",
    "200",
    "HealthzControllerCheck200",
    ACTIVITY_LEGACY_HEALTH_SCHEMA,
  );

  if (
    !isJsonObject(operation) ||
    !isJsonObject(operation.responses) ||
    operation.responses["503"] !== undefined ||
    operation.summary !== "Liveness check"
  ) {
    throw new Error("Activity liveness must not declare dependency failure");
  }

  return {
    ...operation,
    summary: "Health check",
    responses: {
      ...operation.responses,
      "503": {
        content: {
          "application/json": { schema: ACTIVITY_LEGACY_HEALTH_SCHEMA },
        },
      },
    },
  };
};

// Selecting another User's custom theme answers 404; verified by
// account-organization.operations.test.ts.
const normalizeForeignThemeSelection = (
  service: string,
  operationKey: string,
  operation: JsonValue,
): JsonValue =>
  service === "api" && operationKey === "PATCH /users/@me/preferences"
    ? removeResponseStatus(operation, "404")
    : operation;

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

  normalized = normalizeRemovedSearchWorld(service, operationKey, normalized);
  normalized = normalizeInternalPermissionFreshness(
    service,
    operationKey,
    normalized,
  );
  normalized = normalizeActivityLiveness(service, operationKey, normalized);
  normalized = normalizeTimerNpcSearchQuery(service, operationKey, normalized);
  normalized = normalizeForeignThemeSelection(
    service,
    operationKey,
    normalized,
  );

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

// Verified against PostgreSQL by http-boundary.e2e-spec.ts.
const KILL_HISTORY_ADDITION: JsonValue = {
  operationId: "listEventKillHistory",
  parameters: [
    ...["eventId", "guildId"].map((name) => ({
      name,
      in: "path",
      required: true,
      schema: { type: "string" },
    })),
    {
      name: "cursor",
      in: "query",
      required: false,
      schema: { type: "string", minLength: 1, maxLength: 4096 },
    },
    {
      name: "heroId",
      in: "query",
      required: false,
      schema: { type: "string", minLength: 1 },
    },
    {
      name: "limit",
      in: "query",
      required: false,
      schema: { type: "string", pattern: "^(?:[1-9]\\d?|100)$" },
    },
    {
      name: "memberId",
      in: "query",
      required: false,
      schema: { type: "string", pattern: "^[1-9]\\d*$" },
    },
  ],
  security: [{ bearer: [] }],
  responses: {
    "200": {
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/KillHistoryResponse" },
        },
      },
    },
    "400": {
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/HttpErrorResponse" },
        },
      },
    },
    "404": {
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/HttpErrorResponse" },
        },
      },
    },
  },
};

const activityReadinessDatabase = (status: "up" | "down"): JsonValue => ({
  type: "object",
  properties: {
    database: {
      type: "object",
      properties: { status: { type: "string", enum: [status] } },
      required: ["status"],
    },
  },
  required: ["database"],
});

// Verified through the real HTTP encoder and SQL transport in activity-http.test.ts.
const ACTIVITY_READINESS_ADDITION: JsonValue = {
  operationId: "ReadyzController_check",
  parameters: [],
  responses: Object.fromEntries(
    ["200", "503"].map((status) => {
      const database = activityReadinessDatabase(
        status === "200" ? "up" : "down",
      );

      const nullValue = { type: "object", nullable: true, enum: [null] };

      return [
        status,
        {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: [status === "200" ? "ok" : "error"],
                  },
                  info: status === "200" ? database : nullValue,
                  error: status === "200" ? nullValue : database,
                  details: database,
                },
                required: ["status", "info", "error", "details"],
              },
            },
          },
        },
      ];
    }),
  ),
};

// Intentional additions verified against HTTP, persistence and authorization tests:
// activity/src/online/online-repository.integration.test.ts;
// api/test/kill-analytics.integration.test.ts, user-feed.integration.test.ts and records.operations.test.ts.
// The public catalog, readable without signing in. Verified by
// apps/search/test/http-handler.test.ts and
// apps/search/src/catalog/catalog.service.test.ts.
const CATALOG_ITEMS_ADDITION: JsonValue = {
  operationId: "CatalogController_getItems",
  parameters: [
    {
      name: "search",
      in: "query",
      schema: {
        type: "string",
      },
      required: false,
    },
    {
      name: "ids",
      in: "query",
      schema: {
        type: "array",
        items: {
          type: "integer",
          minimum: -9007199254740991,
          maximum: 9007199254740991,
        },
      },
      required: false,
      style: "form",
      explode: true,
    },
    {
      name: "rarities",
      in: "query",
      schema: {
        type: "array",
        items: {
          type: "string",
        },
      },
      required: false,
      style: "form",
      explode: true,
    },
    {
      name: "types",
      in: "query",
      schema: {
        type: "array",
        items: {
          type: "string",
        },
      },
      required: false,
      style: "form",
      explode: true,
    },
    {
      name: "professions",
      in: "query",
      schema: {
        type: "array",
        items: {
          type: "string",
        },
      },
      required: false,
      style: "form",
      explode: true,
    },
    {
      name: "minLevel",
      in: "query",
      schema: {
        type: "number",
      },
      required: false,
    },
    {
      name: "maxLevel",
      in: "query",
      schema: {
        type: "number",
      },
      required: false,
    },
    {
      name: "statKeys",
      in: "query",
      schema: {
        type: "array",
        items: {
          type: "string",
        },
      },
      required: false,
      style: "form",
      explode: true,
    },
    {
      name: "dropSourceTypes",
      in: "query",
      schema: {
        type: "array",
        items: {
          type: "string",
        },
      },
      required: false,
      style: "form",
      explode: true,
    },
    {
      name: "firstSeenWithinDays",
      in: "query",
      schema: {
        type: "number",
      },
      required: false,
    },
    {
      name: "droppedBy",
      in: "query",
      schema: {
        type: "string",
        description: "Items that drop from the NPC with this catalog key.",
      },
      required: false,
    },
    {
      name: "sort",
      in: "query",
      schema: {
        type: "string",
        enum: [
          "relevance",
          "newest",
          "lvl:asc",
          "lvl:desc",
          "name:asc",
          "name:desc",
        ],
        description: "`newest` orders by the first observation, latest first.",
      },
      required: false,
    },
    {
      name: "limit",
      in: "query",
      schema: {
        type: "number",
        default: 24,
      },
      required: false,
    },
    {
      name: "offset",
      in: "query",
      schema: {
        type: "number",
        default: 0,
      },
      required: false,
    },
  ],
  responses: {
    "200": {
      description: "Public catalog items",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/CatalogItemsResponseDto_Output",
          },
        },
      },
    },
    "503": {
      description: "",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/SearchUnavailableEncoded",
          },
        },
      },
    },
  },
};

const CATALOG_NPCS_ADDITION: JsonValue = {
  operationId: "CatalogController_getNpcs",
  parameters: [
    {
      name: "search",
      in: "query",
      schema: {
        type: "string",
      },
      required: false,
    },
    {
      name: "keys",
      in: "query",
      schema: {
        type: "array",
        items: {
          type: "string",
        },
      },
      required: false,
      style: "form",
      explode: true,
    },
    {
      name: "types",
      in: "query",
      schema: {
        type: "array",
        items: {
          type: "string",
        },
      },
      required: false,
      style: "form",
      explode: true,
    },
    {
      name: "sort",
      in: "query",
      schema: {
        type: "string",
        enum: ["relevance", "newest"],
        description: "`newest` orders by the first observation, latest first.",
      },
      required: false,
    },
    {
      name: "limit",
      in: "query",
      schema: {
        type: "number",
        default: 24,
      },
      required: false,
    },
    {
      name: "offset",
      in: "query",
      schema: {
        type: "number",
        default: 0,
      },
      required: false,
    },
  ],
  responses: {
    "200": {
      description: "Public catalog NPCs",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/CatalogNpcsResponseDto_Output",
          },
        },
      },
    },
    "503": {
      description: "",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/SearchUnavailableEncoded",
          },
        },
      },
    },
  },
};

type FactionWarApiContracts = Record<
  | "GET /faction-wars/current"
  | "POST /faction-wars/{warId}/pick"
  | "PATCH /faction-wars/{warId}/pick"
  | "GET /faction-wars/{warId}/leaderboard"
  | "GET /faction-wars/champions"
  | "GET /faction-wars/{warId}/disqualifications"
  | "PUT /faction-wars/{warId}/disqualifications/{userId}"
  | "DELETE /faction-wars/{warId}/disqualifications/{userId}"
  | "GET /public/faction-wars/current",
  JsonValue
>;

type PvpWinsBattlelogContracts = Record<"GET /internal/pvp-wins", JsonValue>;

// Verified by apps/api/src/faction-wars and the faction-wars handler tests.
const FACTION_WAR_API_ADDITIONS: FactionWarApiContracts = {
  "GET /faction-wars/current": {
    operationId: "FactionWarsController_getCurrentWar",
    parameters: [],
    security: [
      {
        bearer: [],
      },
    ],
    responses: {
      "200": {
        description: "FactionWarResponseDto",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/FactionWarResponseDto",
            },
          },
        },
      },
      "404": {
        description: "<No Content>",
      },
    },
    description:
      "The running faction war, else the next or the last one, with the caller's pick and points; 404 when no war is defined",
  },
  "POST /faction-wars/{warId}/pick": {
    operationId: "FactionWarsController_pickFaction",
    parameters: [
      {
        name: "warId",
        in: "path",
        schema: {
          type: "string",
        },
        required: true,
      },
    ],
    security: [
      {
        bearer: [],
      },
    ],
    responses: {
      "201": {
        description: "FactionWarResponseDto",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/FactionWarResponseDto",
            },
          },
        },
      },
      "404": {
        description: "<No Content>",
      },
      "409": {
        description: "HttpErrorResponse",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/HttpErrorResponse",
            },
          },
        },
      },
    },
    description:
      "Lock the caller's faction for a running war; fails with 409 once the caller picked or the war is not running",
    requestBody: {
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/PickFactionDto",
          },
        },
      },
      required: true,
    },
  },
  "PATCH /faction-wars/{warId}/pick": {
    operationId: "FactionWarsController_updatePick",
    parameters: [
      {
        name: "warId",
        in: "path",
        schema: {
          type: "string",
        },
        required: true,
      },
    ],
    security: [
      {
        bearer: [],
      },
    ],
    responses: {
      "200": {
        description: "FactionWarResponseDto",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/FactionWarResponseDto",
            },
          },
        },
      },
      "404": {
        description: "<No Content>",
      },
    },
    description:
      "Hide or show the caller on the war leaderboard and their champion highlight; the faction itself cannot change",
    requestBody: {
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/UpdateFactionWarPickDto",
          },
        },
      },
      required: true,
    },
  },
  "GET /faction-wars/{warId}/leaderboard": {
    operationId: "FactionWarsController_getLeaderboard",
    parameters: [
      {
        name: "warId",
        in: "path",
        schema: {
          type: "string",
        },
        required: true,
      },
      {
        name: "faction",
        in: "query",
        schema: {
          type: "string",
          enum: ["BARBATOS", "TANROTH"],
        },
        required: true,
      },
    ],
    security: [
      {
        bearer: [],
      },
    ],
    responses: {
      "200": {
        description: "FactionWarLeaderboardResponseDto",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/FactionWarLeaderboardResponseDto",
            },
          },
        },
      },
      "404": {
        description: "<No Content>",
      },
    },
    description:
      "Top players of one faction; players who hid themselves keep their rank without a name",
  },
  "GET /faction-wars/champions": {
    operationId: "FactionWarsController_getChampions",
    parameters: [
      {
        name: "world",
        in: "query",
        schema: {
          type: "string",
          minLength: 1,
          maxLength: 64,
        },
        required: true,
      },
    ],
    security: [
      {
        bearer: [],
      },
    ],
    responses: {
      "200": {
        description: "FactionWarChampionsResponseDto",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/FactionWarChampionsResponseDto",
            },
          },
        },
      },
    },
    description:
      "Characters on one world of the last war's winners who show their highlight, for the Game client",
  },
  "GET /faction-wars/{warId}/disqualifications": {
    operationId: "FactionWarsController_getDisqualifications",
    parameters: [
      {
        name: "warId",
        in: "path",
        schema: {
          type: "string",
        },
        required: true,
      },
    ],
    security: [
      {
        bearer: [],
      },
    ],
    responses: {
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: {
              type: "array",
              items: {
                $ref: "#/components/schemas/FactionWarDisqualificationDto",
              },
            },
          },
        },
      },
      "404": {
        description: "<No Content>",
      },
    },
    description:
      "War admins only: the players excluded from a war, with the reason",
  },
  "PUT /faction-wars/{warId}/disqualifications/{userId}": {
    operationId: "FactionWarsController_disqualifyPlayer",
    parameters: [
      {
        name: "warId",
        in: "path",
        schema: {
          type: "string",
        },
        required: true,
      },
      {
        name: "userId",
        in: "path",
        schema: {
          type: "string",
        },
        required: true,
      },
    ],
    security: [
      {
        bearer: [],
      },
    ],
    responses: {
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: {
              type: "array",
              items: {
                $ref: "#/components/schemas/FactionWarDisqualificationDto",
              },
            },
          },
        },
      },
      "404": {
        description: "<No Content>",
      },
    },
    description:
      "War admins only: the player's points stop counting for their faction, they leave the leaderboard and champions, and they earn nothing more",
    requestBody: {
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/DisqualifyFactionWarPlayerDto",
          },
        },
      },
      required: true,
    },
  },
  "DELETE /faction-wars/{warId}/disqualifications/{userId}": {
    operationId: "FactionWarsController_restorePlayer",
    parameters: [
      {
        name: "warId",
        in: "path",
        schema: {
          type: "string",
        },
        required: true,
      },
      {
        name: "userId",
        in: "path",
        schema: {
          type: "string",
        },
        required: true,
      },
    ],
    security: [
      {
        bearer: [],
      },
    ],
    responses: {
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: {
              type: "array",
              items: {
                $ref: "#/components/schemas/FactionWarDisqualificationDto",
              },
            },
          },
        },
      },
      "404": {
        description: "<No Content>",
      },
    },
    description:
      "War admins only: lifts a disqualification; points earned before it count again",
  },
  "GET /public/faction-wars/current": {
    operationId: "FactionWarsController_getPublicCurrentWar",
    parameters: [],
    security: [],
    responses: {
      "200": {
        description: "PublicFactionWarResponseDto",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/PublicFactionWarResponseDto",
            },
          },
        },
      },
      "404": {
        description: "<No Content>",
      },
    },
    description:
      "Dates, rules and faction totals of the current faction war, without any player data",
  },
};

// Internal API caller only; verified by the faction war PvP sync.
const PVP_WINS_BATTLELOG_ADDITIONS: PvpWinsBattlelogContracts = {
  "GET /internal/pvp-wins": {
    operationId: "InternalController_listPvpWins",
    parameters: [
      {
        name: "authorization",
        in: "header",
        schema: {
          nullable: true,
          type: "string",
        },
        required: false,
      },
      {
        name: "afterBattleId",
        in: "query",
        schema: {
          nullable: true,
          type: "string",
        },
        required: false,
      },
      {
        name: "since",
        in: "query",
        schema: {
          type: "string",
        },
        required: true,
      },
      {
        name: "before",
        in: "query",
        schema: {
          type: "string",
        },
        required: true,
      },
      {
        name: "limit",
        in: "query",
        schema: {
          nullable: true,
          type: "string",
        },
        required: false,
      },
    ],
    responses: {
      "200": {
        description: "",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/PvpWinsResponseDto",
            },
          },
        },
      },
      "400": {
        description: "",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                error: {
                  type: "string",
                },
                message: {
                  anyOf: [
                    {
                      type: "string",
                    },
                    {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          path: {
                            type: "array",
                            items: {
                              anyOf: [
                                {
                                  type: "string",
                                },
                                {
                                  anyOf: [
                                    {
                                      type: "number",
                                    },
                                    {
                                      type: "string",
                                      enum: ["Infinity", "-Infinity", "NaN"],
                                    },
                                  ],
                                },
                              ],
                            },
                          },
                          message: {
                            type: "string",
                          },
                        },
                        required: ["path", "message"],
                      },
                    },
                  ],
                },
                statusCode: {
                  type: "number",
                  enum: [400],
                },
              },
              required: ["error", "message", "statusCode"],
            },
          },
        },
      },
      "401": {
        description: "",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                error: {
                  type: "string",
                },
                message: {
                  type: "string",
                },
                statusCode: {
                  type: "number",
                  enum: [401],
                },
              },
              required: ["error", "message", "statusCode"],
            },
          },
        },
      },
    },
    description:
      "Internal API caller only, for faction war points. Lists finished battles won by the submitter's team, ordered by battle ID. Requires the BATTLELOG_CLEANUP_SECRET bearer credential.",
  },
};

const VERIFIED_ADDITIONS = new Map<string, Partial<Record<string, JsonValue>>>(
  Object.entries({
    auth: authApiAdditions,
    search: {
      "GET /public/catalog/items": CATALOG_ITEMS_ADDITION,
      "GET /public/catalog/npcs": CATALOG_NPCS_ADDITION,
    },
    activity: {
      "GET /readyz": ACTIVITY_READINESS_ADDITION,
      "GET /users/@me/activity/online": {
        operationId: "UsersActivityController_getOnline",
        parameters: [
          ...["from", "to"].map((name) => ({
            name,
            in: "query",
            required: true,
            schema: { type: "string" },
          })),
          {
            name: "world",
            in: "query",
            required: false,
            schema: { nullable: true, type: "string", minLength: 1 },
          },
        ],
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
      // Verified by apps/api/test/user-themes.integration.test.ts.
      "GET /users/@me/themes": {
        operationId: "UserThemesController_getThemes",
        parameters: [],
        security: [
          {
            bearer: [],
          },
        ],
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/UserThemeResponseDto",
                  },
                },
              },
            },
          },
        },
        description: "Retrieve the authenticated user's own web themes",
      },
      "POST /users/@me/themes": {
        operationId: "UserThemesController_createTheme",
        parameters: [],
        security: [
          {
            bearer: [],
          },
        ],
        responses: {
          "201": {
            description: "UserThemeResponseDto",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserThemeResponseDto",
                },
              },
            },
          },
          "409": {
            description: "HttpErrorResponse",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/HttpErrorResponse",
                },
              },
            },
          },
        },
        description:
          "Create a web theme for the authenticated user; fails with 409 once the user has reached the theme limit",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateUserThemeDto",
              },
            },
          },
          required: true,
        },
      },
      "GET /users/@me/themes/{themeId}": {
        operationId: "UserThemesController_getTheme",
        parameters: [
          {
            name: "themeId",
            in: "path",
            schema: {
              type: "string",
            },
            required: true,
          },
        ],
        security: [
          {
            bearer: [],
          },
        ],
        responses: {
          "200": {
            description: "UserThemeResponseDto",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserThemeResponseDto",
                },
              },
            },
          },
          "404": {
            description: "<No Content>",
          },
        },
        description: "Retrieve one of the user's own themes",
      },
      "PATCH /users/@me/themes/{themeId}": {
        operationId: "UserThemesController_updateTheme",
        parameters: [
          {
            name: "themeId",
            in: "path",
            schema: {
              type: "string",
            },
            required: true,
          },
        ],
        security: [
          {
            bearer: [],
          },
        ],
        responses: {
          "200": {
            description: "UserThemeResponseDto",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserThemeResponseDto",
                },
              },
            },
          },
          "404": {
            description: "<No Content>",
          },
        },
        description: "Rename or change one of the user's themes",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateUserThemeDto",
              },
            },
          },
          required: true,
        },
      },
      "DELETE /users/@me/themes/{themeId}": {
        operationId: "UserThemesController_deleteTheme",
        parameters: [
          {
            name: "themeId",
            in: "path",
            schema: {
              type: "string",
            },
            required: true,
          },
        ],
        security: [
          {
            bearer: [],
          },
        ],
        responses: {
          "200": {
            description: "SuccessResponseDto_Output",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SuccessResponseDto_Output",
                },
              },
            },
          },
          "404": {
            description: "<No Content>",
          },
        },
        description:
          "Delete one of the user's themes; a user who had it selected falls back to its base theme",
      },
      "POST /users/@me/themes/{themeId}/share": {
        operationId: "UserThemesController_shareTheme",
        parameters: [
          {
            name: "themeId",
            in: "path",
            schema: {
              type: "string",
            },
            required: true,
          },
        ],
        security: [
          {
            bearer: [],
          },
        ],
        responses: {
          "200": {
            description: "UserThemeResponseDto",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserThemeResponseDto",
                },
              },
            },
          },
          "404": {
            description: "<No Content>",
          },
        },
        description:
          "Create a share link token for the theme, or return the existing one",
      },
      "DELETE /users/@me/themes/{themeId}/share": {
        operationId: "UserThemesController_unshareTheme",
        parameters: [
          {
            name: "themeId",
            in: "path",
            schema: {
              type: "string",
            },
            required: true,
          },
        ],
        security: [
          {
            bearer: [],
          },
        ],
        responses: {
          "200": {
            description: "UserThemeResponseDto",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserThemeResponseDto",
                },
              },
            },
          },
          "404": {
            description: "<No Content>",
          },
        },
        description: "Revoke the theme's share link so it no longer resolves",
      },
      "GET /public/themes/{shareToken}": {
        operationId: "UserThemesController_getSharedTheme",
        parameters: [
          {
            name: "shareToken",
            in: "path",
            schema: {
              type: "string",
            },
            required: true,
          },
        ],
        security: [],
        responses: {
          "200": {
            description: "SharedUserThemeResponseDto",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SharedUserThemeResponseDto",
                },
              },
            },
          },
          "404": {
            description: "<No Content>",
          },
        },
        description:
          "Read a theme shared by link; the response names no author",
      },
      "GET /guilds/{guildId}/events/{eventId}/kill-history":
        KILL_HISTORY_ADDITION,
      // Verified by ready-room-visibility.test.ts and ready-room-cas.integration.test.ts.
      "GET /messaging/party-gathering/active": {
        operationId: "PartyReadyRoomController_active",
        parameters: [
          {
            name: "world",
            in: "query",
            required: true,
            schema: { type: "string", minLength: 1, maxLength: 50 },
          },
        ],
        security: [{ bearer: [] }],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/ActivePartyGatheringSummary",
                  },
                },
              },
            },
          },
          "401": {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HttpErrorResponse" },
              },
            },
          },
        },
      },
      // Verified by settings-documents.service.spec.ts (membership filtering).
      "GET /preferences/guilds": {
        operationId: "SettingsDocumentsController_getGuildPreferences",
        parameters: ["domains", "guildIds"].map((name) => ({
          name,
          in: "query",
          required: true,
          schema: { type: "string", minLength: 1 },
        })),
        security: [{ bearer: [] }],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/GuildSettingsDocumentsResponseDto_Output",
                },
              },
            },
          },
          "400": {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HttpErrorResponse" },
              },
            },
          },
          "403": {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HttpErrorResponse" },
              },
            },
          },
        },
      },
      // Verified by http-boundary.e2e-spec.ts: only an active Member of that
      // Organization resolves; every other identity is the same 404.
      "GET /internal/guilds/{guildId}/members/{discordId}/identity": {
        operationId: "GuildsInternalController_getMemberIdentity",
        parameters: ["guildId", "discordId"].map((name) => ({
          name,
          in: "path",
          schema: { type: "string" },
          required: true,
        })),
        security: [],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/InternalMemberIdentityDto",
                },
              },
            },
          },
          "404": {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HttpErrorResponse" },
              },
            },
          },
        },
      },
      // Verified by http-boundary.e2e-spec.ts: refresh skips the cached
      // Discord guild list.
      "POST /users/@me/guilds/refresh": {
        operationId: "UsersController_refreshCurrentUserGuilds",
        parameters: [],
        security: [{ bearer: [] }],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/UserCurrentGuildResponseDto_Output",
                  },
                },
              },
            },
          },
        },
      },
      // Verified by game-client-bootstrap.operations.test.ts: each part runs
      // the operation of the endpoint it replaces, and a failed part is null.
      "GET /users/@me/game-client/bootstrap": {
        operationId: "UsersController_getGameClientBootstrap",
        parameters: [
          {
            name: "gameAccountId",
            in: "query",
            required: true,
            schema: { type: "string", minLength: 1 },
          },
          {
            name: "characterId",
            in: "query",
            required: false,
            schema: { type: "string", minLength: 1 },
          },
        ],
        security: [{ bearer: [] }],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/GameClientBootstrapResponseDto_Output",
                },
              },
            },
          },
        },
      },
      // Verified by global-chat.data-layer.test.ts and
      // global-chat-store.integration.test.ts: only active Members read and
      // send, each world's channel stays apart and unknown worlds are 404,
      // pages keep their cursor, a send within the cooldown or while muted is
      // refused, and only global chat admins delete, pin and mute.
      "GET /global-chat/worlds": {
        operationId: "GlobalChatController_getWorlds",
        description: "List the worlds that have their own global chat channel",
        parameters: [],
        security: [
          {
            bearer: [],
          },
        ],
        responses: {
          "200": {
            description: "GlobalChatWorldsResponse",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/GlobalChatWorldsResponse",
                },
              },
            },
          },
        },
      },
      "GET /global-chat/messages": {
        operationId: "GlobalChatController_getMessages",
        description:
          "Read one page of a global chat channel shared by every Member of any Organization",
        parameters: [
          GLOBAL_CHAT_WORLD_PARAMETER,
          {
            name: "before",
            in: "query",
            schema: {
              type: "string",
            },
            required: false,
          },
        ],
        security: [
          {
            bearer: [],
          },
        ],
        responses: {
          "200": {
            description: "GlobalChatMessagesResponse",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/GlobalChatMessagesResponse",
                },
              },
            },
          },
          "404": {
            description: "<No Content>",
          },
        },
      },
      "POST /global-chat/messages": {
        operationId: "GlobalChatController_sendMessage",
        description:
          "Send a plain-text message to a global chat channel; muted senders are refused",
        parameters: [],
        security: [
          {
            bearer: [],
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SendGlobalChatMessageRequest",
              },
            },
          },
          required: true,
        },
        responses: {
          "201": {
            description: "GlobalChatMessageResponse",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/GlobalChatMessageResponse",
                },
              },
            },
          },
          "404": {
            description: "<No Content>",
          },
        },
      },
      "DELETE /global-chat/messages/{messageId}": {
        operationId: "GlobalChatController_deleteMessage",
        description:
          "Remove a message from a global chat channel; global chat admins only",
        parameters: [
          {
            name: "messageId",
            in: "path",
            schema: {
              type: "string",
              minLength: 1,
            },
            required: true,
          },
          GLOBAL_CHAT_WORLD_PARAMETER,
        ],
        security: [
          {
            bearer: [],
          },
        ],
        responses: {
          "204": {
            description: "<No Content>",
          },
          "404": {
            description: "<No Content>",
          },
        },
      },
      "PUT /global-chat/pinned-message": {
        operationId: "GlobalChatController_pinMessage",
        description:
          "Pin one message above a global chat channel, replacing any pinned one; global chat admins only",
        parameters: [],
        security: [
          {
            bearer: [],
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/PinGlobalChatMessageRequest",
              },
            },
          },
          required: true,
        },
        responses: {
          "200": {
            description: "GlobalChatMessageResponse",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/GlobalChatMessageResponse",
                },
              },
            },
          },
          "404": {
            description: "<No Content>",
          },
        },
      },
      "DELETE /global-chat/pinned-message": {
        operationId: "GlobalChatController_unpinMessage",
        description:
          "Remove the pinned message of a global chat channel; global chat admins only",
        parameters: [GLOBAL_CHAT_WORLD_PARAMETER],
        security: [
          {
            bearer: [],
          },
        ],
        responses: {
          "204": {
            description: "<No Content>",
          },
          "404": {
            description: "<No Content>",
          },
        },
      },
      "GET /global-chat/mutes": {
        operationId: "GlobalChatController_getMutes",
        description:
          "List senders who may not write in the global chat; global chat admins only",
        parameters: [],
        security: [
          {
            bearer: [],
          },
        ],
        responses: {
          "200": {
            description: "GlobalChatMutesResponse",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/GlobalChatMutesResponse",
                },
              },
            },
          },
        },
      },
      "POST /global-chat/mutes": {
        operationId: "GlobalChatController_muteSender",
        description:
          "Stop the sender of a kept message from writing in every global chat channel; global chat admins only",
        parameters: [],
        security: [
          {
            bearer: [],
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/MuteGlobalChatSenderRequest",
              },
            },
          },
          required: true,
        },
        responses: {
          "201": {
            description: "GlobalChatMuteResponse",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/GlobalChatMuteResponse",
                },
              },
            },
          },
          "404": {
            description: "<No Content>",
          },
        },
      },
      "DELETE /global-chat/mutes/{muteId}": {
        operationId: "GlobalChatController_unmuteSender",
        description: "Lift a global chat mute; global chat admins only",
        parameters: [
          {
            name: "muteId",
            in: "path",
            schema: {
              type: "string",
              minLength: 1,
            },
            required: true,
          },
        ],
        security: [
          {
            bearer: [],
          },
        ],
        responses: {
          "204": {
            description: "<No Content>",
          },
          "404": {
            description: "<No Content>",
          },
        },
      },
      "DELETE /global-chat/messages/{messageId}/sender-mute": {
        operationId: "GlobalChatController_unmuteMessageSender",
        description:
          "Lift the mute of the sender of a kept message; 404 when the sender is not muted; global chat admins only",
        parameters: [
          {
            name: "messageId",
            in: "path",
            schema: { type: "string", minLength: 1 },
            required: true,
          },
          GLOBAL_CHAT_WORLD_PARAMETER,
        ],
        security: [{ bearer: [] }],
        responses: {
          "204": { description: "<No Content>" },
          "404": { description: "<No Content>" },
        },
      },
      "GET /users/@me/stats/loots": {
        operationId: "LootsController_getUserLootStats",
        parameters: [
          {
            name: "days",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["7", "30", "90", "365"] },
          },
          USER_KILL_WORLD_PARAMETER,
          USER_KILL_CHARACTER_PARAMETER,
        ],
        security: [{ bearer: [] }],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserLootStatsResponseDto_Output",
                },
              },
            },
          },
        },
      },
      "GET /users/@me/feed": {
        operationId: "UsersController_getUserFeed",
        parameters: USER_FEED_PARAMETERS,
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
              [
                {
                  name: "days",
                  in: "query",
                  required: false,
                  schema: {
                    type: "string",
                    enum: ["7", "30", "90", "365"],
                  },
                },
                USER_KILL_WORLD_PARAMETER,
                // Narrows only the analytics rankings to one NPC type.
                {
                  name: "npcType",
                  in: "query",
                  required: false,
                  schema: { $ref: "#/components/schemas/NpcType" },
                },
                USER_KILL_CHARACTER_PARAMETER,
              ],
            ],
            [
              "activity",
              "KillsController_getUserKillActivity",
              "UserKillActivityResponseDto_Output",
              [USER_KILL_WORLD_PARAMETER, USER_KILL_CHARACTER_PARAMETER],
            ],
            [
              "characters",
              "KillsController_getUserKillCharacters",
              "UserKillCharactersResponseDto_Output",
              [],
            ],
          ] as const
        ).map(
          ([path, operationId, response, parameters]): [string, JsonValue] => [
            `GET /users/@me/stats/kills/${path}`,
            {
              operationId,
              parameters: [...parameters],
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
          ],
        ),
      ),
      ...FACTION_WAR_API_ADDITIONS,
    },
    battlelog: PVP_WINS_BATTLELOG_ADDITIONS,
  } satisfies Record<string, Record<string, JsonValue>>),
);

export const assertVerifiedAddition = (
  service: string,
  operationKey: string,
  operation: JsonValue | undefined,
): void => {
  const expected = VERIFIED_ADDITIONS.get(service)?.[operationKey];

  if (!expected || !isJsonObject(operation)) {
    throw new Error(`Unverified API addition: ${service} ${operationKey}`);
  }

  const keyNormalized =
    service === "auth"
      ? operation
      : normalizeApiKeyErrors(
          service === "api"
            ? normalizeReauthenticationErrors(
                normalizeValidationErrors(operation),
              )
            : operation,
          expected,
        );

  if (!isJsonObject(keyNormalized)) throw new Error("Invalid operation");
  const { tags: _tags, summary: _summary, ...contract } = keyNormalized;

  if (!sameOpenApiContract(contract, expected)) {
    throw new Error(
      `Verified API contract changed: ${service} ${operationKey}`,
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
        !sameOpenApiContract(errorContract, {
          type: "object",
          properties: { message: { type: "string" } },
          required: ["message"],
        })
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
          !sameOpenApiContract(previousResponse, response)
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

// Removes one middleware error alternative from a status while retaining every
// existing contract for that status.
const withoutErrorAlternative = (
  operation: JsonValue,
  status: string,
  ref: string,
): JsonValue => {
  if (!isJsonObject(operation) || !isJsonObject(operation.responses))
    return operation;
  const response = operation.responses[status];

  if (!isJsonObject(response) || !isJsonObject(response.content))
    return operation;
  const media = response.content["application/json"];

  if (!isJsonObject(media) || !isJsonObject(media.schema)) return operation;

  const alternatives = isJsonArray(media.schema.anyOf)
    ? media.schema.anyOf
    : [media.schema];

  const remaining = alternatives.filter(
    (alternative) =>
      !isJsonObject(alternative) ||
      Object.keys(alternative).length !== 1 ||
      alternative.$ref !== ref,
  );

  if (remaining.length === alternatives.length) return operation;
  const responses = { ...operation.responses };

  if (remaining.length === 0) {
    delete responses[status];
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

  return { ...operation, responses };
};

// Verified by the real endpoint validation cases in the API schema-error-response tests.
// Remove only the new validation alternative; retain every existing 400 contract.
export const normalizeValidationErrors = (operation: JsonValue): JsonValue =>
  withoutErrorAlternative(
    operation,
    "400",
    "#/components/schemas/RequestValidationError",
  );

// Verified by the reauthentication cases in the API HTTP boundary e2e spec.
// Remove only the bearer middleware's 401 alternative; retain every existing
// 401 contract.
export const normalizeReauthenticationErrors = (
  operation: JsonValue,
): JsonValue =>
  withoutErrorAlternative(
    operation,
    "401",
    "#/components/schemas/ReauthenticationRequiredEncoded",
  );

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
        current.set(
          key,
          normalizeApiKeyErrors(
            service.current === "api"
              ? normalizeReauthenticationErrors(
                  normalizeValidationErrors(operation),
                )
              : operation,
            beforeKeys.get(key),
          ),
        );
      }
    }

    const additions = [...current.keys()].filter((key) => !baseline.has(key));
    const removals = [...baseline.keys()].filter((key) => !current.has(key));

    const expectedAdditions = Object.keys(
      VERIFIED_ADDITIONS.get(service.current) ?? {},
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
      assertVerifiedAddition(service.current, key, current.get(key));
    }

    // User editing, the unused Organization loot count endpoint, the UUID
    // kill history lists replaced by listEventKillHistory and the unused event
    // coordinator were removed.
    const expectedRemovals =
      service.current === "api"
        ? [
            "PATCH /guilds/{guildId}/chat-messages/{messageId}",
            "GET /guilds/{guildId}/loots/count",
            "GET /guilds/{guildId}/events/{eventId}/kills",
            "GET /guilds/{guildId}/events/{eventId}/members/{memberId}/kills",
            "GET /guilds/{guildId}/events/{eventId}/heroes/{heroId}/kills",
            "GET /guilds/{guildId}/events/{eventId}/coordination",
          ]
        : [];

    if (
      removals.length !== expectedRemovals.length ||
      removals.some((key) => !expectedRemovals.includes(key))
    ) {
      throw new Error(
        `${service.current} has unexpected OpenAPI removals: ${removals.join(", ") || "none"}`,
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
    "OpenAPI parity passed: 243 baseline operations plus verified additions\n",
  );
}
