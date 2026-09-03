import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  DiscordGuildSyncStatusSchema,
  type DiscordGuildChannelSnapshot,
  type DiscordGuildSyncState,
} from "@lootlog/schema/notifications";
import { Effect, Schema } from "effect";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";
import {
  outboundHttpRequest,
  type OutboundHttpFailure,
} from "#src/shared/http/outbound-http";
const DiscordGuildChannelSnapshotSchema = Schema.Struct({
  guildId: Schema.String,
  channelId: Schema.String,
  name: Schema.String,
  channelType: Schema.String,
  parentId: Schema.NullOr(Schema.String),
  position: Schema.Number,
  active: Schema.Boolean,
  canView: Schema.Boolean,
  canSend: Schema.Boolean,
  hasRequiredPermissions: Schema.Boolean,
  requiredPermissions: Schema.mutable(Schema.Array(Schema.String)),
  grantedPermissions: Schema.mutable(Schema.Array(Schema.String)),
  missingPermissions: Schema.mutable(Schema.Array(Schema.String)),
  lastSyncedAt: Schema.String,
});
const DiscordGuildSyncStateSchema = Schema.Struct({
  guildId: Schema.String,
  status: DiscordGuildSyncStatusSchema,
  hasRequiredPermissions: Schema.Boolean,
  requiredPermissions: Schema.mutable(Schema.Array(Schema.String)),
  grantedPermissions: Schema.mutable(Schema.Array(Schema.String)),
  missingPermissions: Schema.mutable(Schema.Array(Schema.String)),
  channelCount: Schema.Number,
  selectableChannelCount: Schema.Number,
  lastAttemptAt: Schema.NullOr(Schema.String),
  lastSuccessAt: Schema.NullOr(Schema.String),
  lastError: Schema.NullOr(Schema.String),
  updatedAt: Schema.String,
});
const DiscordGuildChannelsResponse = Schema.Struct({
  channels: Schema.mutable(Schema.Array(DiscordGuildChannelSnapshotSchema)),
  syncState: DiscordGuildSyncStateSchema,
});

type GuildChannels = {
  readonly channels: DiscordGuildChannelSnapshot[];
  readonly syncState: DiscordGuildSyncState;
};

export class DiscordBotClientFailure extends TaggedErrorClass<DiscordBotClientFailure>()(
  "DiscordBotClientFailure",
  {
    reason: Schema.Literals(["invalid-response", "status"]),
    message: Schema.String,
    status: Schema.optional(Schema.Number),
  },
) {}

type DiscordBotFailure = OutboundHttpFailure | DiscordBotClientFailure;

export interface DiscordBotClient {
  readonly getGuildChannels: (
    guildId: string,
  ) => Effect.Effect<GuildChannels, DiscordBotFailure>;
  readonly refreshGuildChannels: (
    guildId: string,
  ) => Effect.Effect<GuildChannels, DiscordBotFailure>;
  readonly getGuildSyncStatus: (
    guildId: string,
  ) => Effect.Effect<DiscordGuildSyncState, DiscordBotFailure>;
}

export const makeDiscordBotClient = (
  httpClient: HttpClientValue,
  discordBotServiceUrl: URL,
): DiscordBotClient => {
  const request = <A>(
    decodeJson: (value: string) => A,
    url: string,
    method: "GET" | "POST",
    timeout: number,
  ) =>
    outboundHttpRequest(httpClient, {
      adapter: "discord-bot",
      body: method === "POST" ? "{}" : undefined,
      headers: method === "POST" ? { "content-type": "application/json" } : {},
      method,
      responseLimitBytes: 1024 * 1024,
      retryTimes: method === "GET" ? 2 : 0,
      timeout: `${timeout} millis`,
      url,
    }).pipe(
      Effect.flatMap((response) =>
        response.status >= 200 && response.status < 300
          ? Effect.try({
              try: () => decodeJson(new TextDecoder().decode(response.body)),
              catch: () =>
                new DiscordBotClientFailure({
                  reason: "invalid-response",
                  message: "Discord Bot returned invalid JSON",
                }),
            })
          : Effect.fail(
              new DiscordBotClientFailure({
                reason: "status",
                message: `Discord Bot request failed: ${response.status}`,
                status: response.status,
              }),
            ),
      ),
    );

  const serviceUrl = discordBotServiceUrl.toString().replace(/\/$/, "");
  return {
    getGuildChannels: (guildId) =>
      request(
        Schema.decodeUnknownSync(
          Schema.fromJsonString(DiscordGuildChannelsResponse),
        ),
        `${serviceUrl}/internal/guilds/${guildId}/channels`,
        "GET",
        5000,
      ),
    refreshGuildChannels: (guildId) =>
      request(
        Schema.decodeUnknownSync(
          Schema.fromJsonString(DiscordGuildChannelsResponse),
        ),
        `${serviceUrl}/internal/guilds/${guildId}/channels/refresh`,
        "POST",
        10_000,
      ),
    getGuildSyncStatus: (guildId) =>
      request(
        Schema.decodeUnknownSync(
          Schema.fromJsonString(DiscordGuildSyncStateSchema),
        ),
        `${serviceUrl}/internal/guilds/${guildId}/sync-status`,
        "GET",
        5000,
      ),
  };
};
