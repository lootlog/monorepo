import { Schema } from "effect";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";

const OpenApiSchema = Schema.Record(Schema.String, Schema.Json);
const OpenApiParameter = Schema.Struct({
  in: Schema.optionalKey(Schema.String),
  name: Schema.optionalKey(Schema.String),
  required: Schema.optionalKey(Schema.Boolean),
});
const OpenApiDocument = Schema.Struct({
  components: Schema.optionalKey(
    Schema.Struct({
      schemas: Schema.optionalKey(Schema.Record(Schema.String, OpenApiSchema)),
    }),
  ),
  paths: Schema.optionalKey(
    Schema.Record(
      Schema.String,
      Schema.Record(
        Schema.String,
        Schema.Struct({
          parameters: Schema.optionalKey(Schema.Array(OpenApiParameter)),
          responses: Schema.optionalKey(
            Schema.Record(
              Schema.String,
              Schema.Struct({
                content: Schema.optionalKey(
                  Schema.Record(
                    Schema.String,
                    Schema.Struct({
                      schema: Schema.optionalKey(OpenApiSchema),
                    }),
                  ),
                ),
              }),
            ),
          ),
        }),
      ),
    ),
  ),
});
const decodeDocument = Schema.decodeUnknownSync(OpenApiDocument, {
  onExcessProperty: "preserve",
});

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

const optionalLootQueryParameters = [
  "cursor",
  "npcLevelMin",
  "npcLevelMax",
  "itemLevelMin",
  "itemLevelMax",
  "playerLevelMin",
  "playerLevelMax",
] as const;

const lootQueryPaths = [
  "/guilds/{guildId}/loots",
  "/guilds/{guildId}/loots/count",
] as const;

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

export const checkOpenApi = (): void => {
  const repositoryRoot = resolve("../..");
  const openApiPath = resolve(repositoryRoot, "apps/api/openapi.yaml");
  const document = decodeDocument(parse(readFileSync(openApiPath, "utf8")));

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

  for (const pathKey of lootQueryPaths) {
    const parameters = document.paths?.[pathKey]?.get?.parameters ?? [];

    for (const parameterName of optionalLootQueryParameters) {
      const parameter = parameters.find(
        (candidate) =>
          candidate.in === "query" && candidate.name === parameterName,
      );

      assert(
        parameter?.required === false,
        `Expected raw OpenAPI query parameter ${parameterName} for GET ${pathKey} to be optional`,
      );
    }
  }
};
