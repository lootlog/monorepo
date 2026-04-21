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
        description?: string;
        operationId?: string;
        parameters?: Array<Record<string, unknown>>;
        requestBody?: Record<string, unknown>;
        responses?: Record<string, Record<string, unknown>>;
        security?: Array<Record<string, unknown>[] | Record<string, unknown>>;
        summary?: string;
        tags?: string[];
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

const ensureOperation = (
  document: OpenApiDocument,
  pathKey: string,
  method: string,
  operation: Record<string, unknown>,
) => {
  document.paths ??= {};
  document.paths[pathKey] ??= {};
  document.paths[pathKey]![method] = {
    ...document.paths[pathKey]![method],
    ...operation,
  };
};

const setOperationParameterRequired = (
  document: OpenApiDocument,
  pathKey: string,
  method: string,
  parameterName: string,
  required: boolean,
) => {
  const operation = document.paths?.[pathKey]?.[method];

  if (!operation?.parameters) {
    return;
  }

  for (const parameter of operation.parameters) {
    if (
      parameter &&
      typeof parameter === "object" &&
      parameter.name === parameterName
    ) {
      parameter.required = required;
    }
  }
};

const setNotificationJobsPayloadSnapshotSchema = (
  document: OpenApiDocument,
  schemaRef: string,
) => {
  const notificationJobsSchema =
    document.components?.schemas?.NotificationJobsResponseDto;

  if (
    !notificationJobsSchema ||
    typeof notificationJobsSchema !== "object" ||
    !("properties" in notificationJobsSchema) ||
    !notificationJobsSchema.properties ||
    typeof notificationJobsSchema.properties !== "object"
  ) {
    return;
  }

  const collections = ["pending", "history"] as const;

  for (const collectionKey of collections) {
    const collectionSchema = notificationJobsSchema.properties[collectionKey] as
      | OpenApiSchema
      | undefined;
    const itemSchema =
      collectionSchema &&
      typeof collectionSchema === "object" &&
      "items" in collectionSchema &&
      collectionSchema.items &&
      typeof collectionSchema.items === "object"
        ? (collectionSchema.items as OpenApiSchema)
        : undefined;

    if (
      !itemSchema ||
      !("properties" in itemSchema) ||
      !itemSchema.properties ||
      typeof itemSchema.properties !== "object"
    ) {
      continue;
    }

    itemSchema.properties.payloadSnapshot = {
      allOf: [{ $ref: schemaRef }],
      nullable: true,
    };
  }
};

const jsonScalarSchema = {
  anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
} satisfies OpenApiSchema;

const jsonValueSchema = {
  anyOf: [
    jsonScalarSchema,
    {
      type: "array",
      items: {
        $ref: "#/components/schemas/JsonValue",
      },
    },
    {
      type: "object",
      additionalProperties: {
        $ref: "#/components/schemas/JsonValue",
      },
    },
  ],
  nullable: true,
} satisfies OpenApiSchema;

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

ensureSchema(document, "JsonValue", jsonValueSchema);

ensureSchema(document, "GameMapResponseDto", {
  type: "object",
  properties: {
    id: { type: "number" },
    name: { type: "string" },
  },
  required: ["id", "name"],
});

ensureSchema(document, "MapTemplateResponseDto", {
  type: "object",
  properties: {
    id: { type: "string" },
    guildId: { type: "string" },
    name: { type: "string" },
    maps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
        },
        required: ["id", "name"],
      },
    },
    createdAt: { type: "string", format: "date-time" },
  },
  required: ["id", "guildId", "name", "maps", "createdAt"],
});

ensureSchema(document, "TimerNpcResponseDto", {
  type: "object",
  properties: {
    id: { type: "number" },
    name: { type: "string" },
    prof: { type: "string" },
    location: { type: "string" },
    wt: { type: "string" },
    lvl: { type: "number" },
    type: {
      type: "string",
      enum: [
        "COMMON",
        "ELITE",
        "ELITE2",
        "ELITE3",
        "HERO",
        "EVENT_HERO",
        "TITAN",
        "COLOSSUS",
        "NPC",
      ],
    },
    icon: { type: "string", nullable: true },
    margonemType: { type: "string" },
  },
  required: [
    "id",
    "name",
    "prof",
    "location",
    "wt",
    "lvl",
    "type",
    "icon",
    "margonemType",
  ],
});

ensureSchema(document, "LootShareResponseDto", {
  type: "object",
  additionalProperties: {
    type: "array",
    items: {
      type: "string",
    },
  },
});

ensureSchema(document, "NotificationAllowedMentionsResponseDto", {
  type: "object",
  properties: {
    parse: {
      type: "array",
      items: {
        type: "string",
        enum: ["roles", "users", "everyone"],
      },
    },
    roles: {
      type: "array",
      items: {
        type: "string",
      },
    },
    users: {
      type: "array",
      items: {
        type: "string",
      },
    },
    repliedUser: { type: "boolean" },
  },
});

ensureSchema(document, "NotificationJobPayloadSnapshotResponseDto", {
  type: "object",
  properties: {
    title: { type: "string", nullable: true },
    message: { type: "string", nullable: true },
    content: { type: "string", nullable: true },
    allowedMentions: {
      allOf: [
        { $ref: "#/components/schemas/NotificationAllowedMentionsResponseDto" },
      ],
      nullable: true,
    },
    ruleId: { type: "integer", nullable: true },
    ruleName: { type: "string", nullable: true },
    triggerType: {
      type: "string",
      enum: [
        "TIMER_BEFORE_SPAWN",
        "NPC_SPAWNED",
        "WATCHED_ITEM_DROPPED",
        "SCHEDULED_MESSAGE",
      ],
      nullable: true,
    },
    world: { type: "string", nullable: true },
    npcId: { type: "integer", nullable: true },
    npcName: { type: "string", nullable: true },
    timerKey: { type: "string", nullable: true },
    minSpawnTime: { type: "string", format: "date-time", nullable: true },
    maxSpawnTime: { type: "string", format: "date-time", nullable: true },
    scheduledFor: { type: "string", format: "date-time", nullable: true },
    scheduleStrategy: {
      type: "string",
      enum: ["SPAWN_WINDOW_RELATIVE", "FIXED_DATETIME"],
      nullable: true,
    },
    scheduleAnchor: {
      type: "string",
      enum: ["MIN_SPAWN", "MAX_SPAWN"],
      nullable: true,
    },
    scheduleOffsetMinutes: { type: "integer", nullable: true },
    contentTemplate: { type: "string", nullable: true },
    testTriggeredAt: { type: "string", format: "date-time", nullable: true },
  },
});

ensureSchema(document, "TimerResponseDto", {
  type: "object",
  properties: {
    guildId: { type: "string" },
    npcId: { type: "number" },
    timerKey: { type: "string" },
    world: { type: "string" },
    minSpawnTime: { type: "string", format: "date-time" },
    maxSpawnTime: { type: "string", format: "date-time" },
    npc: {
      allOf: [{ $ref: "#/components/schemas/TimerNpcResponseDto" }],
      nullable: true,
    },
    wasReset: { type: "boolean" },
    member: { $ref: "#/components/schemas/MemberResponseDto" },
    updatedAt: { type: "string", format: "date-time" },
  },
  required: [
    "guildId",
    "npcId",
    "timerKey",
    "world",
    "minSpawnTime",
    "maxSpawnTime",
    "npc",
    "wasReset",
    "updatedAt",
  ],
});

ensureSchema(document, "LootResponseDto", {
  type: "object",
  properties: {
    id: { type: "number" },
    uniqueId: { type: "string" },
    world: { type: "string" },
    source: {
      type: "string",
      enum: ["LOOTBOX", "DIALOG", "FIGHT"],
    },
    location: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "number" },
          hid: { type: "string" },
          name: { type: "string" },
          icon: { type: "string" },
          stat: { type: "string" },
          type: { type: "string", nullable: true },
          rarity: {
            type: "string",
            enum: ["COMMON", "UPGRADED", "UNIQUE", "HEROIC", "LEGENDARY"],
            nullable: true,
          },
          lvl: { type: "number" },
          prof: {
            type: "array",
            items: {
              type: "string",
              enum: ["w", "m", "h", "t", "p", "b"],
            },
          },
        },
        required: [
          "id",
          "hid",
          "name",
          "icon",
          "stat",
          "type",
          "rarity",
          "lvl",
          "prof",
        ],
      },
    },
    players: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            anyOf: [{ type: "string" }, { type: "number" }],
          },
          name: { type: "string" },
          lvl: { type: "number", nullable: true },
          prof: {
            type: "string",
            enum: ["w", "m", "h", "t", "p", "b"],
            nullable: true,
          },
          icon: { type: "string", nullable: true },
          characterId: { type: "number", nullable: true },
          accountId: { type: "number", nullable: true },
          hpp: { type: "number", nullable: true },
        },
        required: [
          "id",
          "name",
          "lvl",
          "prof",
          "icon",
          "characterId",
          "accountId",
          "hpp",
        ],
      },
    },
    npcs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "number" },
          name: { type: "string" },
          wt: { type: "number", nullable: true },
          lvl: { type: "number", nullable: true },
          prof: {
            type: "string",
            enum: ["w", "m", "h", "t", "p", "b"],
            nullable: true,
          },
          icon: { type: "string", nullable: true },
          type: {
            type: "string",
            enum: [
              "COMMON",
              "ELITE",
              "ELITE2",
              "ELITE3",
              "HERO",
              "EVENT_HERO",
              "TITAN",
              "COLOSSUS",
              "NPC",
            ],
            nullable: true,
          },
          margonemType: { type: "number", nullable: true },
        },
        required: [
          "id",
          "name",
          "wt",
          "lvl",
          "prof",
          "icon",
          "type",
          "margonemType",
        ],
      },
    },
    lootShare: {
      $ref: "#/components/schemas/LootShareResponseDto",
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    submissions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          guildId: { type: "string" },
          memberId: { type: "number" },
          lootId: { type: "number" },
          member: {
            type: "object",
            properties: {
              name: { type: "string" },
              avatar: { type: "string", nullable: true },
              userId: { type: "string" },
            },
            required: ["name", "avatar", "userId"],
          },
        },
        required: ["guildId", "memberId", "lootId", "member"],
      },
    },
    commentsCount: { type: "number" },
  },
  required: [
    "id",
    "uniqueId",
    "world",
    "source",
    "location",
    "items",
    "players",
    "npcs",
    "lootShare",
    "createdAt",
    "updatedAt",
    "commentsCount",
  ],
});

ensureSchema(document, "NullableLootResponseDto", {
  allOf: [{ $ref: "#/components/schemas/LootResponseDto" }],
  nullable: true,
});

ensureSchema(document, "LootCommentResponseDto", {
  type: "object",
  properties: {
    id: { type: "number" },
    lootId: { type: "number" },
    guildId: { type: "string" },
    content: { type: "string" },
    member: {
      type: "object",
      properties: {
        name: { type: "string" },
        avatar: { type: "string", nullable: true },
        userId: { type: "string" },
        roles: {
          type: "array",
          items: {
            type: "object",
            properties: {
              color: { type: "number", nullable: true },
            },
          },
        },
      },
      required: ["name", "userId"],
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  required: [
    "id",
    "lootId",
    "guildId",
    "content",
    "member",
    "createdAt",
    "updatedAt",
  ],
});

ensureJsonResponse(document, "/guilds/{guildId}/worlds", "get", "200", {
  type: "array",
  items: { type: "string" },
});

ensureJsonResponse(document, "/maps", "get", "200", {
  type: "array",
  items: {
    $ref: "#/components/schemas/GameMapResponseDto",
  },
});

ensureJsonResponse(document, "/timers", "get", "200", {
  type: "array",
  items: {
    $ref: "#/components/schemas/TimerResponseDto",
  },
});

ensureJsonResponse(document, "/guilds/{guildId}/timers", "get", "200", {
  type: "array",
  items: {
    $ref: "#/components/schemas/TimerResponseDto",
  },
});

ensureJsonResponse(document, "/guilds/{guildId}/map-templates", "get", "200", {
  type: "array",
  items: {
    $ref: "#/components/schemas/MapTemplateResponseDto",
  },
});

ensureJsonResponse(document, "/guilds/{guildId}/map-templates", "post", "201", {
  $ref: "#/components/schemas/MapTemplateResponseDto",
});

ensureOperation(
  document,
  "/guilds/{guildId}/map-templates/{templateId}",
  "put",
  {
    description: "Update an existing reusable map template",
    operationId: "MapTemplatesController_updateTemplate",
    parameters: [
      {
        name: "templateId",
        required: true,
        in: "path",
        description: "Template ID",
        schema: {
          type: "string",
        },
      },
      {
        name: "guildId",
        required: true,
        in: "path",
        description: "Guild ID",
        schema: {
          type: "string",
        },
      },
    ],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/CreateMapTemplateDto",
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Template updated successfully",
      },
    },
    security: [{ bearer: [] }],
    summary: "Update map template",
    tags: ["map-templates"],
  },
);

ensureJsonResponse(
  document,
  "/guilds/{guildId}/map-templates/{templateId}",
  "put",
  "200",
  {
    $ref: "#/components/schemas/MapTemplateResponseDto",
  },
);

ensureJsonResponse(
  document,
  "/guilds/{guildId}/map-templates/{templateId}",
  "delete",
  "200",
  {
    $ref: "#/components/schemas/StatusOkResponseDto_Output",
  },
);

ensureJsonResponse(document, "/guilds/{guildId}/loots", "get", "200", {
  type: "array",
  items: {
    $ref: "#/components/schemas/LootResponseDto",
  },
});

ensureJsonResponse(document, "/guilds/{guildId}/loots/{lootId}", "get", "200", {
  $ref: "#/components/schemas/NullableLootResponseDto",
});

ensureJsonResponse(
  document,
  "/guilds/{guildId}/loots/{lootId}/comments",
  "get",
  "200",
  {
    type: "array",
    items: {
      $ref: "#/components/schemas/LootCommentResponseDto",
    },
  },
);

ensureJsonResponse(
  document,
  "/guilds/{guildId}/loots/{lootId}/comments",
  "post",
  "201",
  {
    $ref: "#/components/schemas/LootCommentResponseDto",
  },
);

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

setNotificationJobsPayloadSnapshotSchema(
  document,
  "#/components/schemas/NotificationJobPayloadSnapshotResponseDto",
);

for (const pathKey of [
  "/guilds/{guildId}/loots",
  "/guilds/{guildId}/loots/count",
]) {
  for (const parameterName of [
    "cursor",
    "npcLevelMin",
    "npcLevelMax",
    "itemLevelMin",
    "itemLevelMax",
    "playerLevelMin",
    "playerLevelMax",
  ]) {
    setOperationParameterRequired(
      document,
      pathKey,
      "get",
      parameterName,
      false,
    );
  }
}

fs.writeFileSync(
  openApiPath,
  yaml.dump(openApiDocument, openApiYamlDumpOptions),
  "utf8",
);
