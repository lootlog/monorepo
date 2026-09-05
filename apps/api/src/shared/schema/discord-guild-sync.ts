import {
  discordPermissionFields,
  DiscordGuildSyncStatus,
} from "@lootlog/schema/discord";
import { Schema } from "effect";
import {
  isoDatetimeCodec,
  nullableIsoDatetimeCodec,
} from "./response-codecs.js";

export const DiscordGuildChannelSnapshotResponse = Schema.Struct({
  id: Schema.Int,
  guildId: Schema.String,
  channelId: Schema.String,
  name: Schema.String,
  channelType: Schema.String,
  parentId: Schema.NullOr(Schema.String),
  position: Schema.Int,
  active: Schema.Boolean,
  canView: Schema.Boolean,
  canSend: Schema.Boolean,
  ...discordPermissionFields,
  lastSyncedAt: isoDatetimeCodec,
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});
export type DiscordGuildChannelSnapshotResponse =
  typeof DiscordGuildChannelSnapshotResponse.Type;

export const DiscordGuildSyncStateResponse = Schema.Struct({
  guildId: Schema.String,
  status: DiscordGuildSyncStatus,
  ...discordPermissionFields,
  channelCount: Schema.Int,
  selectableChannelCount: Schema.Int,
  lastAttemptAt: nullableIsoDatetimeCodec,
  lastSuccessAt: nullableIsoDatetimeCodec,
  lastError: Schema.NullOr(Schema.String),
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});
export type DiscordGuildSyncStateResponse =
  typeof DiscordGuildSyncStateResponse.Type;
