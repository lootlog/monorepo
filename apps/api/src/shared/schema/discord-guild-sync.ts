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
  hasRequiredPermissions: Schema.Boolean,
  requiredPermissions: Schema.Array(Schema.String),
  grantedPermissions: Schema.Array(Schema.String),
  missingPermissions: Schema.Array(Schema.String),
  lastSyncedAt: isoDatetimeCodec,
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});
export type DiscordGuildChannelSnapshotResponse =
  typeof DiscordGuildChannelSnapshotResponse.Type;

export const DiscordGuildSyncStateResponse = Schema.Struct({
  guildId: Schema.String,
  status: Schema.Literals([
    "SYNCED",
    "SYNCING",
    "FAILED",
    "STALE",
    "NOT_FOUND",
  ]),
  hasRequiredPermissions: Schema.Boolean,
  requiredPermissions: Schema.Array(Schema.String),
  grantedPermissions: Schema.Array(Schema.String),
  missingPermissions: Schema.Array(Schema.String),
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
