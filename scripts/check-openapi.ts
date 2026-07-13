import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

type YamlModule = {
  load: (content: string) => unknown;
};

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
        responses?: Record<
          string,
          {
            content?: Record<
              string,
              {
                schema?: OpenApiSchema;
              }
            >;
          }
        >;
      }
    >
  >;
};

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const yaml = requireFromApi("js-yaml") as YamlModule;

const openApiPath = path.resolve("apps/api/openapi.yaml");
const openApiDocument = yaml.load(fs.readFileSync(openApiPath, "utf8"));
const document = openApiDocument as OpenApiDocument;

function hasJsonResponseSchema(
  pathKey: string,
  method: string,
  statusCode: string,
) {
  return Boolean(
    document.paths?.[pathKey]?.[method]?.responses?.[statusCode]?.content?.[
      "application/json"
    ]?.schema,
  );
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const responseChecks = [
  ["/maps", "get", "200"],
  ["/timers", "get", "200"],
  ["/guilds/{guildId}/timers", "get", "200"],
  ["/guilds/{guildId}/map-templates", "get", "200"],
  ["/guilds/{guildId}/map-templates", "post", "201"],
  ["/guilds/{guildId}/map-templates/{templateId}", "put", "200"],
  ["/guilds/{guildId}/map-templates/{templateId}", "delete", "200"],
  ["/guilds/{guildId}/loots", "get", "200"],
  ["/guilds/{guildId}/loots/{lootId}", "get", "200"],
  ["/guilds/{guildId}/loots/{lootId}/comments", "get", "200"],
  ["/guilds/{guildId}/loots/{lootId}/comments", "post", "201"],
  ["/guilds/{guildId}/chat-messages", "get", "200"],
  ["/guilds/{guildId}/chat-messages", "post", "201"],
  ["/guilds/{guildId}/chat-messages/{messageId}", "patch", "200"],
  ["/guilds/{guildId}/chat-messages/{messageId}", "delete", "200"],
  ["/messaging", "post", "201"],
  ["/messaging/party-gathering", "post", "201"],
  ["/messaging/party-gathering", "get", "200"],
  ["/messaging/party-gathering/{notificationId}", "get", "200"],
  ["/messaging/party-gathering/{notificationId}/close", "post", "201"],
  ["/messaging/party-gathering/{notificationId}/cancel", "post", "201"],
] as const;

for (const [pathKey, method, statusCode] of responseChecks) {
  assert(
    hasJsonResponseSchema(pathKey, method, statusCode),
    `Missing raw OpenAPI response schema for ${method.toUpperCase()} ${pathKey} (${statusCode})`,
  );
}

const requiredSchemas = [
  "TimerNpcResponseDto",
  "LootShareResponseDto",
  "NotificationAllowedMentionsResponseDto",
  "NotificationJobPayloadSnapshotResponseDto",
] as const;

for (const schemaName of requiredSchemas) {
  assert(
    document.components?.schemas?.[schemaName],
    `Missing raw OpenAPI component schema ${schemaName}`,
  );
}
