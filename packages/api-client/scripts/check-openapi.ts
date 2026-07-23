import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

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
  ["/messaging/party-gathering/{notificationId}/applications", "post", "201"],
  [
    "/messaging/party-gathering/{notificationId}/invitations/targets",
    "post",
    "201",
  ],
  ["/messaging/party-gathering/{notificationId}/cancel", "post", "201"],
] as const;

const requiredSchemas = [
  "TimerNpcResponseDto",
  "LootShareResponseDto",
  "NotificationAllowedMentionsResponseDto",
  "NotificationJobPayloadSnapshotResponseDto",
] as const;

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

export const checkOpenApi = (): void => {
  const repositoryRoot = resolve("../..");
  const requireFromApi = createRequire(
    resolve(repositoryRoot, "apps/api/package.json"),
  );
  const yaml = requireFromApi("js-yaml") as YamlModule;
  const openApiPath = resolve(repositoryRoot, "apps/api/openapi.yaml");
  const document = yaml.load(
    readFileSync(openApiPath, "utf8"),
  ) as OpenApiDocument;

  for (const [pathKey, method, statusCode] of responseChecks) {
    const responseSchema =
      document.paths?.[pathKey]?.[method]?.responses?.[statusCode]?.content?.[
        "application/json"
      ]?.schema;
    assert(
      responseSchema,
      `Missing raw OpenAPI response schema for ${method.toUpperCase()} ${pathKey} (${statusCode})`,
    );
  }

  for (const schemaName of requiredSchemas) {
    assert(
      document.components?.schemas?.[schemaName],
      `Missing raw OpenAPI component schema ${schemaName}`,
    );
  }
};
