import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  openApiYamlDumpOptions,
  type OpenApiYamlDumpOptions,
  sanitizeOpenApiDocument,
} from "../packages/nest-shared/src/openapi";

type YamlModule = {
  load: (content: string) => unknown;
  dump: (document: unknown, options: OpenApiYamlDumpOptions) => string;
};

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const yaml = requireFromApi("js-yaml") as YamlModule;

const openApiPath = path.resolve("apps/api/openapi.yaml");
const openApiDocument = yaml.load(fs.readFileSync(openApiPath, "utf8"));

sanitizeOpenApiDocument(openApiDocument);

type OpenApiSchema = Record<string, unknown>;
type OpenApiDocument = {
  components?: {
    schemas?: Record<string, OpenApiSchema>;
  };
  paths?: Record<
    string,
    Record<
      string,
      {
        responses?: Record<string, Record<string, unknown>>;
      }
    >
  >;
};

const ensureSchema = (
  document: OpenApiDocument,
  schemaName: string,
  schema: OpenApiSchema,
) => {
  document.components ??= {};
  document.components.schemas ??= {};
  document.components.schemas[schemaName] = schema;
};

const ensureJsonResponse = (
  document: OpenApiDocument,
  pathKey: string,
  method: string,
  statusCode: string,
  schema: OpenApiSchema,
) => {
  const operation = document.paths?.[pathKey]?.[method];

  if (!operation) {
    return;
  }

  operation.responses ??= {};
  const response = (operation.responses[statusCode] ??= {});
  response.content = {
    "application/json": {
      schema,
    },
  };
};

const document = openApiDocument as OpenApiDocument;

ensureSchema(document, "ChatMessageResponseDto_Output", {
  type: "object",
  properties: {
    id: { type: "string", minLength: 1 },
    guildId: { type: "string", minLength: 1 },
    message: { type: "string", maxLength: 128 },
    senderId: { type: "string", minLength: 1 },
    timestamp: { type: "string", format: "date-time" },
    type: {
      type: "string",
      enum: ["NORMAL", "NOTIFICATION", "NPC", "PARTY_GATHERING"],
    },
    characterData: {
      type: "object",
      properties: {
        nick: { type: "string", minLength: 1 },
        id: { type: "number" },
        acc: { type: "number" },
        lvl: { type: "number" },
        prof: { type: "string", minLength: 1 },
        icon: { type: "string", minLength: 1 },
      },
      required: ["nick", "id", "acc", "lvl", "prof", "icon"],
    },
    npc: {
      type: "object",
      properties: {
        id: { type: "number" },
        name: { type: "string", minLength: 1 },
        location: { type: "string", minLength: 1 },
        lvl: { type: "number" },
        prof: { type: "string", minLength: 1 },
        wt: { type: "number" },
        hpp: { type: "number" },
        icon: { type: "string", minLength: 1 },
        type: { type: "number" },
        x: { type: "number" },
        y: { type: "number" },
      },
      required: ["id", "name", "location", "lvl", "prof", "wt", "icon", "type"],
    },
    partyGathering: {
      type: "object",
      properties: {
        notificationId: { type: "string", minLength: 1 },
        discordId: { type: "string", minLength: 1 },
        description: { type: "string", maxLength: 200 },
        minLvl: { type: "number", minimum: 1, maximum: 500 },
        maxLvl: { type: "number", minimum: 1, maximum: 500 },
        world: { type: "string", minLength: 1, maxLength: 50 },
      },
      required: ["notificationId", "discordId", "world"],
    },
  },
  required: [
    "id",
    "guildId",
    "message",
    "senderId",
    "timestamp",
    "type",
    "characterData",
  ],
});

ensureSchema(document, "ChatMessageActionResponseDto_Output", {
  type: "object",
  properties: {
    success: { type: "boolean" },
  },
  required: ["success"],
});

ensureSchema(document, "NotificationResponseDto_Output", {
  type: "object",
  properties: {
    notificationId: { type: "string", minLength: 1 },
    guildIds: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
  },
  required: ["notificationId", "guildIds"],
});

ensureSchema(document, "CancelPartyGatheringResponseDto_Output", {
  type: "object",
  properties: {
    success: { type: "boolean" },
    guildIds: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
  },
  required: ["success", "guildIds"],
});

ensureJsonResponse(document, "/guilds/{guildId}/worlds", "get", "200", {
  type: "array",
  items: { type: "string" },
});

ensureJsonResponse(document, "/guilds/{guildId}/chat-messages", "get", "200", {
  type: "array",
  items: {
    $ref: "#/components/schemas/ChatMessageResponseDto_Output",
  },
});

ensureJsonResponse(document, "/guilds/{guildId}/chat-messages", "post", "201", {
  $ref: "#/components/schemas/ChatMessageResponseDto_Output",
});

ensureJsonResponse(
  document,
  "/guilds/{guildId}/chat-messages/{messageId}",
  "patch",
  "200",
  {
    $ref: "#/components/schemas/ChatMessageActionResponseDto_Output",
  },
);

ensureJsonResponse(
  document,
  "/guilds/{guildId}/chat-messages/{messageId}",
  "delete",
  "200",
  {
    $ref: "#/components/schemas/ChatMessageActionResponseDto_Output",
  },
);

ensureJsonResponse(document, "/messaging", "post", "201", {
  $ref: "#/components/schemas/NotificationResponseDto_Output",
});

ensureJsonResponse(document, "/messaging/party-gathering", "post", "201", {
  $ref: "#/components/schemas/NotificationResponseDto_Output",
});

ensureJsonResponse(document, "/messaging/party-gathering", "delete", "200", {
  $ref: "#/components/schemas/CancelPartyGatheringResponseDto_Output",
});

ensureJsonResponse(
  document,
  "/messaging/party-gathering/{notificationId}",
  "delete",
  "200",
  {
    $ref: "#/components/schemas/CancelPartyGatheringResponseDto_Output",
  },
);

fs.writeFileSync(
  openApiPath,
  yaml.dump(openApiDocument, openApiYamlDumpOptions),
  "utf8",
);
